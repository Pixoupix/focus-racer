import { Connector, ConnectorConfig, ConnectorResult, StartListParticipant } from "./base";

/**
 * KMS (Klikego/Chronorace) connector - imports participants from KMS timing system.
 * KMS provides start-list data associated with timed events.
 */
export const kmsConnector: Connector = {
  name: "KMS / Chronorace",
  id: "kms",
  description: "Importez les inscriptions depuis KMS/Chronorace (système de chronométrage).",
  requiredFields: [
    { key: "eventId", label: "ID Événement KMS", placeholder: "Ex: EVT-2026-001" },
    { key: "apiKey", label: "Clé API KMS", placeholder: "Votre clé API KMS", type: "password" },
    { key: "apiUrl", label: "URL API (optionnel)", placeholder: "https://api.kms-timing.com/v1" },
  ],

  async fetchParticipants(config: ConnectorConfig): Promise<ConnectorResult> {
    if (!config.eventId || !config.apiKey) {
      throw new Error("ID événement et clé API requis pour KMS");
    }

    const apiUrl = config.apiUrl || "https://api.kms-timing.com/v1";

    const response = await fetch(
      `${apiUrl}/events/${config.eventId}/participants`,
      {
        headers: {
          "X-API-Key": config.apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`KMS API error (${response.status}): ${text}`);
    }

    const data = await response.json();

    const participants: StartListParticipant[] = (data.participants || data.data || []).map(
      (p: Record<string, unknown>) => ({
        bibNumber: String(p.bib || p.dossard || p.number || ""),
        firstName: String(p.firstname || p.prenom || p.first_name || ""),
        lastName: String(p.lastname || p.nom || p.last_name || ""),
        email: p.email ? String(p.email) : undefined,
      })
    ).filter((p: StartListParticipant) => p.bibNumber && p.firstName);

    return {
      participants,
      total: participants.length,
      source: "kms",
      importedAt: new Date(),
    };
  },
};
