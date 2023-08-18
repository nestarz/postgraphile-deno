import "https://deno.land/std@0.198.0/dotenv/load.ts";
import { createServer } from "node:http";
import { grafserv } from "grafserv/node";
import { postgraphile } from "postgraphile";

import { makePgService } from "@dataplan/pg/adaptors/pg";
import AmberPreset from "postgraphile/presets/amber";
import { makeV4Preset } from "postgraphile/presets/v4";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";
import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgManyToManyPreset } from "@graphile-contrib/pg-many-to-many";
import { Buffer } from "node:buffer";
// import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";

// For configuration file details, see: https://postgraphile.org/postgraphile/next/config

/** @satisfies {GraphileConfig.Preset} */
const preset = {
  extends: [
    AmberPreset.default ?? AmberPreset,
    makeV4Preset({
      /* Enter your V4 options here */
      graphiql: true,
      graphiqlRoute: "/",
    }),
    PostGraphileConnectionFilterPreset,
    PgManyToManyPreset,
    PgAggregatesPreset,
    // PgSimplifyInflectionPreset
  ],
  pgServices: [
    makePgService({
      // Database connection string:
      connectionString: Deno.env.get("DATABASE_URL"),
      // List of schemas to expose:
      schemas: Deno.env.get("DATABASE_SCHEMAS")?.split(",") ?? ["public"],
      // Enable LISTEN/NOTIFY:
      pubsub: false,
    }),
  ],
  grafserv: {
    port: 5670,
    websockets: true,
    graphqlPath: "/api/",
  },
  grafast: {
    explain: true,
  },
};

const server = createServer((req, res) => {
  const [username, password] = [
    Deno.env.get("USERNAME"),
    Deno.env.get("PASSWORD"),
  ];
  const userpass = Buffer.from(
    (req.headers.authorization || "").split(" ")[1] || "",
    "base64",
  ).toString();
  if (password && userpass !== [username, password].join(":")) {
    res.writeHead(401, { "WWW-Authenticate": 'Basic realm="nope"' });
    res.end("HTTP Error 401 Unauthorized: Access is denied");
    return;
  }
});

server.on("error", (e) => {
  console.error(e);
});

const serv = postgraphile(preset).createServ(grafserv);

// Mount the request handler into a new HTTP server, and register websockets if
// desired
serv.addTo(server).catch((e) => {
  console.error(e);
  Deno.exit(1);
});

// Start the Node server
server.listen(5005);
export default server;
