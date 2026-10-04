# Freegma in ChatGPT

Use **https://freegma-theta.vercel.app/mcp** as the MCP server URL. A board's `/w/…/b/…` address opens its canvas; it is not an MCP connection URL.

## Connect

1. In ChatGPT on the web, enable **Developer mode** in **Settings → Security and login**. Availability depends on the account and workspace policy.
2. Create a custom MCP connection from **Plugins** (some interfaces label this **Apps**). Name it **Freegma**, enter the URL above and select **No authentication**.
3. Create the connection and check that Freegma's tools are discovered.
4. Open a conversation and add/enable Freegma from its tools menu. Merely pasting a board link does not enable MCP tools.

No API key or OAuth login is required. This deployment intentionally grants anonymous callers the existing read and edit tools. Origin checks protect browser transport boundaries; they do not identify users or restrict server-side callers. Tool annotations describe reads and destructive actions, while revisions protect concurrent edits. These are not authentication or user roles.

The server runs on the local PC. **Vercel → public tunnel → local Freegma → local `.free` files** is used for both the website and MCP. Keep the PC, Freegma terminal and tunnel terminal running. Vercel holds the proxy configuration, not a second copy of the designs. Public MCP results return board links using the first configured public origin, so proxies cannot replace them with temporary tunnel links; local MCP results return local links.

Try these prompts after connecting:

- “List my Freegma projects, then list boards in the Freegma project.”
- “Inspect this board's outline and its shared component references. Tell me which master owns the selected control.”
- “Read the current revision, change this button's text as one atomic operation, then give me the board link.”
- “Export the selected frame as React and CSS for implementation.”

For efficient reads, use `freegma_get_board` with `view: "outline"`, then `view: "nodes"` and a `nodeId`. Send `expectedRevision` when paging or editing. Mutations accept `responseMode: "compact"`. A stale revision fails rather than overwriting someone else's work. The transport reuses every existing tool, including components, color schematics, flows, comments, Undo/Redo and portable exports.

## Local and other clients

After `yarn build` and `yarn start`, Streamable HTTP is available at **http://127.0.0.1:4330/mcp** for clients on this PC. Existing stdio clients keep using `yarn mcp` or `server/mcp.mjs`; both transports share the same handlers and storage.

Freegma uses stateless Streamable HTTP with JSON responses. POST requests must include `Content-Type: application/json` and `Accept: application/json, text/event-stream`. Initialization negotiates a supported MCP version; subsequent requests can send `MCP-Protocol-Version`. Notifications receive an empty 202 response. No session cookie, session ID or persistent SSE connection is needed. GET `/mcp` returning 405 is normal; opening it as a webpage is not a connection test. Authentication discovery URLs return 404 because authentication is disabled.

For another browser-based MCP client, set `FREEGMA_MCP_ORIGINS` to its exact HTTP(S) origin, separated by commas. The default is `https://chatgpt.com`. This permission applies only to `/mcp`; it does not broaden editor API origins. Public hosting still requires the existing `FREEGMA_PUBLIC_ORIGINS` or public-access configuration and a running tunnel. MCP does not start tunnels automatically.

## Troubleshooting

- **Page title but no project names:** enable the MCP connection in the conversation. The website is a React editor; a text-only web reader does not load its project data.
- **Connection unavailable:** first check the local `/api/health`, tunnel and public `/api/health`. All must reach the same current Freegma version.
- **Tools missing:** reconnect the custom connection so it discovers the latest tool definitions. Use the complete `/mcp` URL.
- **403 from a browser client:** inspect its Origin and the configured public/client origins. Do not substitute a board URL.
- **Revision conflict:** read the latest board, reconcile the requested change and submit against its current revision.

The endpoint can be verified independently, but ChatGPT account availability and enabling it in a conversation are separate user-side steps.

References: [OpenAI connection instructions](https://developers.openai.com/plugins/deploy/connect-chatgpt), [OpenAI authentication guidance](https://developers.openai.com/plugins/build/auth), [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
