export { maxDuration, runtime } from "../_shared";
import { handleVoltAgentRequest } from "../_shared";

export default async function handler(request: Request) {
  return handleVoltAgentRequest(request);
}
