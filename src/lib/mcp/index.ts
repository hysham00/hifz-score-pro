import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCategories from "./tools/list-categories";
import listParticipants from "./tools/list-participants";
import getResults from "./tools/get-results";
import listMyScores from "./tools/list-my-scores";
import submitScore from "./tools/submit-score";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "musabaqa-mcp",
  title: "Musabaqa MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Musabaqa Qur'anic competition management system. Use `list_categories` and `list_participants` to browse, `get_results` for rankings, and (for judges) `list_my_scores` and `submit_score` to review and enter scores.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCategories, listParticipants, getResults, listMyScores, submitScore],
});
