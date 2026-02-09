import { Connector, ConnectorConfig, ConnectorResult, StartListParticipant } from "./base";

/**
 * Generic CSV/URL connector - fetches a CSV from a URL and parses it.
 * Supports any platform that provides a public CSV download link.
 */
export const genericCsvConnector: Connector = {
  name: "CSV depuis URL",
  id: "generic-csv",
  description: "Importez une start-list depuis n'importe quelle URL de fichier CSV.",
  requiredFields: [
    { key: "apiUrl", label: "URL du fichier CSV", placeholder: "https://example.com/start-list.csv" },
    { key: "bibColumn", label: "Colonne dossard (optionnel)", placeholder: "Ex: bib ou dossard (auto-détection sinon)" },
  ],

  async fetchParticipants(config: ConnectorConfig): Promise<ConnectorResult> {
    if (!config.apiUrl) {
      throw new Error("URL du fichier CSV requise");
    }

    const response = await fetch(config.apiUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status} lors du téléchargement du CSV`);
    }

    const text = await response.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      throw new Error("Le fichier CSV est vide ou ne contient qu'un en-tête");
    }

    // Detect separator
    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    // Auto-detect column indices
    const bibCol = config.bibColumn
      ? headers.indexOf(config.bibColumn.toLowerCase())
      : headers.findIndex((h) => /^(bib|dossard|number|n°|num|numero)$/i.test(h));

    const firstNameCol = headers.findIndex((h) =>
      /^(first_?name|prenom|prénom|firstname)$/i.test(h)
    );
    const lastNameCol = headers.findIndex((h) =>
      /^(last_?name|nom|lastname|name|family_?name)$/i.test(h)
    );
    const emailCol = headers.findIndex((h) =>
      /^(email|e-mail|mail|courriel)$/i.test(h)
    );

    if (bibCol === -1) {
      throw new Error(
        `Colonne dossard non trouvée. Colonnes disponibles : ${headers.join(", ")}`
      );
    }

    const participants: StartListParticipant[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map((c) => c.trim().replace(/"/g, ""));
      const bibNumber = cols[bibCol];
      if (!bibNumber) continue;

      participants.push({
        bibNumber,
        firstName: firstNameCol >= 0 ? cols[firstNameCol] || "" : "",
        lastName: lastNameCol >= 0 ? cols[lastNameCol] || "" : "",
        email: emailCol >= 0 ? cols[emailCol] || undefined : undefined,
      });
    }

    return {
      participants: participants.filter((p) => p.bibNumber),
      total: participants.length,
      source: "generic-csv",
      importedAt: new Date(),
    };
  },
};
