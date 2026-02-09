import { Connector, ConnectorConfig, ConnectorResult, StartListParticipant } from "./base";

/**
 * Njuko connector - imports participants from Njuko registration platform.
 * Njuko provides a public API to fetch event registrations.
 * API docs: https://api.njuko.com/docs
 */
export const njukoConnector: Connector = {
  name: "Njuko",
  id: "njuko",
  description: "Importez les inscriptions depuis Njuko (plateforme d'inscription aux événements sportifs).",
  requiredFields: [
    { key: "eventId", label: "ID Événement Njuko", placeholder: "Ex: 12345" },
    { key: "apiKey", label: "Clé API Njuko", placeholder: "Votre clé API Njuko", type: "password" },
  ],

  async fetchParticipants(config: ConnectorConfig): Promise<ConnectorResult> {
    if (!config.eventId || !config.apiKey) {
      throw new Error("ID événement et clé API requis pour Njuko");
    }

    const apiUrl = config.apiUrl || "https://api.njuko.com/v1";

    const response = await fetch(
      `${apiUrl}/events/${config.eventId}/registrations`,
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Njuko API error (${response.status}): ${text}`);
    }

    const data = await response.json();

    // Map Njuko data format to our standard format
    const participants: StartListParticipant[] = (data.registrations || data.data || []).map(
      (reg: Record<string, unknown>) => ({
        bibNumber: String(reg.bib_number || reg.bibNumber || reg.dossard || ""),
        firstName: String(reg.first_name || reg.firstName || reg.prenom || ""),
        lastName: String(reg.last_name || reg.lastName || reg.nom || ""),
        email: reg.email ? String(reg.email) : undefined,
      })
    ).filter((p: StartListParticipant) => p.bibNumber && p.firstName);

    return {
      participants,
      total: participants.length,
      source: "njuko",
      importedAt: new Date(),
    };
  },
};
