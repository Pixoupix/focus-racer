import sharp from "sharp";

// Sharp config: optimized for 16-core dedicated server (64 GB RAM)
// 16 queue workers × 1 vips thread = 16 threads (1 per physical core)
// Node.js event loop + PostgreSQL share hyperthreads (32 total threads)
sharp.concurrency(1);

// Enable libvips cache: 64 GB RAM available
// memory: limit in MB, items: number of entries, files: open file descriptors
sharp.cache({ memory: 2048, items: 200, files: 200 });

export default sharp;
