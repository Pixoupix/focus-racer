import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";

// ─── AWS Pricing Constants ──────────────────────────────────────────────
const AWS_PRICING = {
  detectText: 0.0015, // $/image
  indexFaces: 0.0001, // $/face
  searchFacesByImage: 0.001, // $/search
  s3Put: 0.005 / 1000, // $/request
  s3StoragePerGB: 0.023, // $/GB/month
};

const FREE_TIER = {
  rekognitionImages: 1000, // images/month (12 months)
  s3StorageGB: 5, // GB
  s3PutRequests: 2000, // requests/month
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;

    if (fromParam) {
      dateFrom = new Date(fromParam);
      if (isNaN(dateFrom.getTime())) dateFrom = null;
    }
    if (toParam) {
      dateTo = new Date(toParam);
      if (isNaN(dateTo.getTime())) dateTo = null;
      else dateTo.setHours(23, 59, 59, 999);
    }

    const dateFilter = dateFrom
      ? { createdAt: { gte: dateFrom, ...(dateTo ? { lte: dateTo } : {}) } }
      : {};

    // Current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const currentMonthFilter = { createdAt: { gte: monthStart, lte: monthEnd } };

    const [
      // --- Total counts (all time or period) ---
      totalOcrAws,
      totalFaceIndexed,
      totalFaceRecognitionBibs,
      totalS3Uploads,
      totalBlurryFiltered,
      totalPhotos,

      // --- Current month counts (for Free Tier tracker) ---
      monthOcrAws,
      monthFaceIndexed,
      monthFaceRecognitionBibs,
      monthS3Uploads,

      // --- Monthly trend (12 months) ---
      monthlyTrend,

      // --- S3 storage estimate ---
      s3PhotoCount,
    ] = await Promise.all([
      // Total (period-filtered)
      prisma.photo.count({ where: { ocrProvider: "ocr_aws", ...dateFilter } }),
      prisma.photo.count({ where: { faceIndexed: true, ...dateFilter } }),
      prisma.bibNumber.count({ where: { source: "face_recognition", ...(dateFrom ? { photo: { createdAt: { gte: dateFrom, ...(dateTo ? { lte: dateTo } : {}) } } } : {}) } }),
      prisma.photo.count({ where: { s3Key: { not: null }, ...dateFilter } }),
      prisma.photo.count({ where: { isBlurry: true, ...dateFilter } }),
      prisma.photo.count({ where: dateFilter }),

      // Current month
      prisma.photo.count({ where: { ocrProvider: "ocr_aws", ...currentMonthFilter } }),
      prisma.photo.count({ where: { faceIndexed: true, ...currentMonthFilter } }),
      prisma.bibNumber.count({ where: { source: "face_recognition", photo: { createdAt: { gte: monthStart, lte: monthEnd } } } }),
      prisma.photo.count({ where: { s3Key: { not: null }, ...currentMonthFilter } }),

      // Monthly trend (raw SQL for groupBy month)
      prisma.$queryRaw<{ month: string; ocr: number; faces: number; search: number; s3: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'YYYY-MM') as month,
          COUNT(CASE WHEN p."ocrProvider" = 'ocr_aws' THEN 1 END)::int as ocr,
          COUNT(CASE WHEN p."faceIndexed" = true THEN 1 END)::int as faces,
          0::int as search,
          COUNT(CASE WHEN p."s3Key" IS NOT NULL THEN 1 END)::int as s3
        FROM "Photo" p
        WHERE p."createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', p."createdAt")
        ORDER BY month ASC
      `,

      // S3 storage (all photos with s3Key)
      prisma.photo.count({ where: { s3Key: { not: null } } }),
    ]);

    // Enrich monthly trend with SearchFacesByImage counts (join Photo for createdAt)
    const searchByMonth = await prisma.$queryRaw<{ month: string; search: number }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'YYYY-MM') as month,
        COUNT(*)::int as search
      FROM "BibNumber" b
      JOIN "Photo" p ON p.id = b."photoId"
      WHERE b.source = 'face_recognition'
        AND p."createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', p."createdAt")
      ORDER BY month ASC
    `;

    const searchMap = new Map(searchByMonth.map((s) => [s.month, s.search]));
    const enrichedTrend = monthlyTrend.map((m) => ({
      ...m,
      search: searchMap.get(m.month) || 0,
    }));

    // ─── Cost calculations ──────────────────────────────────────────────
    const estimatedStorageGB = s3PhotoCount * 2.5 / 1024; // ~2.5 MB per photo
    const totalRekognitionCalls = totalOcrAws + totalFaceIndexed + totalFaceRecognitionBibs;

    const costs = {
      detectText: totalOcrAws * AWS_PRICING.detectText,
      indexFaces: totalFaceIndexed * AWS_PRICING.indexFaces,
      searchFaces: totalFaceRecognitionBibs * AWS_PRICING.searchFacesByImage,
      s3Put: totalS3Uploads * AWS_PRICING.s3Put,
      s3Storage: estimatedStorageGB * AWS_PRICING.s3StoragePerGB,
      total: 0,
    };
    costs.total =
      costs.detectText + costs.indexFaces + costs.searchFaces + costs.s3Put + costs.s3Storage;

    // Monthly costs
    const monthRekognitionCalls = monthOcrAws + monthFaceIndexed + monthFaceRecognitionBibs;
    const monthlyCosts = {
      detectText: monthOcrAws * AWS_PRICING.detectText,
      indexFaces: monthFaceIndexed * AWS_PRICING.indexFaces,
      searchFaces: monthFaceRecognitionBibs * AWS_PRICING.searchFacesByImage,
      s3Put: monthS3Uploads * AWS_PRICING.s3Put,
      s3Storage: estimatedStorageGB * AWS_PRICING.s3StoragePerGB,
      total: 0,
    };
    monthlyCosts.total =
      monthlyCosts.detectText +
      monthlyCosts.indexFaces +
      monthlyCosts.searchFaces +
      monthlyCosts.s3Put +
      monthlyCosts.s3Storage;

    // ─── Free Tier usage ────────────────────────────────────────────────
    const freeTier = {
      rekognition: {
        used: monthRekognitionCalls,
        limit: FREE_TIER.rekognitionImages,
        pct: Math.min((monthRekognitionCalls / FREE_TIER.rekognitionImages) * 100, 100),
      },
      s3Storage: {
        usedGB: Math.round(estimatedStorageGB * 100) / 100,
        limitGB: FREE_TIER.s3StorageGB,
        pct: Math.min((estimatedStorageGB / FREE_TIER.s3StorageGB) * 100, 100),
      },
      s3Put: {
        used: monthS3Uploads,
        limit: FREE_TIER.s3PutRequests,
        pct: Math.min((monthS3Uploads / FREE_TIER.s3PutRequests) * 100, 100),
      },
    };

    // Savings from pre-filtering
    const savings = {
      blurryFiltered: totalBlurryFiltered,
      estimatedSaved:
        totalBlurryFiltered *
        (AWS_PRICING.detectText + AWS_PRICING.indexFaces + AWS_PRICING.searchFacesByImage),
    };

    // ─── AWS Cost Explorer (optional) ───────────────────────────────────
    let costExplorer: {
      available: boolean;
      error?: string;
      months?: { start: string; end: string; service: string; amount: number; currency: string }[];
    } = { available: false };

    try {
      const client = new CostExplorerClient({ region: "us-east-1" });

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startDate = threeMonthsAgo.toISOString().slice(0, 10);
      const endDate = now.toISOString().slice(0, 10);

      const command = new GetCostAndUsageCommand({
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: "MONTHLY",
        Filter: {
          Dimensions: {
            Key: "SERVICE",
            Values: ["Amazon Rekognition", "Amazon Simple Storage Service"],
          },
        },
        Metrics: ["UnblendedCost"],
        GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
      });

      const response = await client.send(command);
      const months: { start: string; end: string; service: string; amount: number; currency: string }[] = [];

      for (const result of response.ResultsByTime || []) {
        for (const group of result.Groups || []) {
          months.push({
            start: result.TimePeriod?.Start || "",
            end: result.TimePeriod?.End || "",
            service: group.Keys?.[0] || "",
            amount: parseFloat(group.Metrics?.UnblendedCost?.Amount || "0"),
            currency: group.Metrics?.UnblendedCost?.Unit || "USD",
          });
        }
      }

      costExplorer = { available: true, months };
    } catch (err: any) {
      costExplorer = {
        available: false,
        error: err.name === "AccessDeniedException"
          ? "Permission ce:GetCostAndUsage manquante sur le user IAM"
          : err.message || "Erreur Cost Explorer",
      };
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      period: dateFrom
        ? `${dateFrom.toISOString().slice(0, 10)}${dateTo ? " - " + dateTo.toISOString().slice(0, 10) : ""}`
        : "all",

      overview: {
        totalApiCalls: totalRekognitionCalls + totalS3Uploads,
        totalRekognitionCalls,
        totalS3Operations: totalS3Uploads,
        estimatedCost: Math.round(costs.total * 1000) / 1000,
        monthlyCost: Math.round(monthlyCosts.total * 1000) / 1000,
        totalPhotos,
        savings,
      },

      rekognition: {
        detectText: { count: totalOcrAws, cost: Math.round(costs.detectText * 1000) / 1000 },
        indexFaces: { count: totalFaceIndexed, cost: Math.round(costs.indexFaces * 1000) / 1000 },
        searchFaces: { count: totalFaceRecognitionBibs, cost: Math.round(costs.searchFaces * 1000) / 1000 },
        monthlyTrend: enrichedTrend,
      },

      s3: {
        uploads: totalS3Uploads,
        estimatedStorageGB: Math.round(estimatedStorageGB * 100) / 100,
        costPut: Math.round(costs.s3Put * 1000) / 1000,
        costStorage: Math.round(costs.s3Storage * 1000) / 1000,
      },

      freeTier,
      costExplorer,
      pricing: AWS_PRICING,
    });
  } catch (error) {
    console.error("Error fetching AWS usage:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des donnees AWS" },
      { status: 500 }
    );
  }
}
