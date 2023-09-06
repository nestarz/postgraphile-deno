import "std/dotenv/load.ts";
import { router } from "rutt";
import { grafserv } from "outils/postgraphile/grafserv/deno/mod.ts";

import { postgraphile } from "postgraphile";

import { makePgService } from "@dataplan/pg/adaptors/pg";
import AmberPreset from "postgraphile/presets/amber";
import { makeV4Preset } from "postgraphile/presets/v4";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";
import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgManyToManyPreset } from "@graphile-contrib/pg-many-to-many";

const preset: GraphileConfig.Preset = {
  extends: [
    AmberPreset,
    makeV4Preset({
      graphiql: true,
      graphiqlRoute: "/",
    }),
    PostGraphileConnectionFilterPreset,
    PgManyToManyPreset,
    PgAggregatesPreset,
  ],
  pgServices: [
    makePgService({
      connectionString: Deno.env.get("DATABASE_URL"),
      schemas: Deno.env.get("DATABASE_SCHEMAS")?.split(",") ?? ["public"],
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

const serv = postgraphile(preset).createServ(grafserv);
Deno.serve(
  { port: 7100 },
  router({ "/*": (req, res) => serv.handler(req, res) })
).finished;
