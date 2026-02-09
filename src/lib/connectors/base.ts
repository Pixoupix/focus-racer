/**
 * Base interface for all external registration platform connectors.
 * Each connector implements this interface to import start-list data.
 */
export interface StartListParticipant {
  bibNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface ConnectorConfig {
  apiKey?: string;
  apiUrl?: string;
  eventId?: string;
  [key: string]: string | undefined;
}

export interface ConnectorResult {
  participants: StartListParticipant[];
  total: number;
  source: string;
  importedAt: Date;
}

export interface Connector {
  name: string;
  id: string;
  description: string;
  requiredFields: Array<{ key: string; label: string; placeholder: string; type?: string }>;
  fetchParticipants(config: ConnectorConfig): Promise<ConnectorResult>;
}
