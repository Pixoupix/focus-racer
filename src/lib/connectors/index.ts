import { Connector } from "./base";
import { njukoConnector } from "./njuko";
import { kmsConnector } from "./kms";
import { genericCsvConnector } from "./generic-csv";

export type { Connector, ConnectorConfig, ConnectorResult, StartListParticipant } from "./base";

/**
 * Registry of all available connectors.
 * To add a new connector, create it in a separate file and add it here.
 */
export const connectors: Record<string, Connector> = {
  njuko: njukoConnector,
  kms: kmsConnector,
  "generic-csv": genericCsvConnector,
};

export function getConnector(id: string): Connector | undefined {
  return connectors[id];
}

export function listConnectors(): Connector[] {
  return Object.values(connectors);
}
