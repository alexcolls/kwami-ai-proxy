import { createBareServer } from "@nebula-services/bare-server-node";
import { createServer } from "http";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";

const bare = createBareServer("/bare/", {
	logErrors: true,
	blockLocal: false,
});

wisp.options.allow_loopback_ips = true;
wisp.options.allow_private_ips = true;

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				if (bare.shouldRoute(req)) {
					bare.routeRequest(req, res);
				} else {
					handler(req, res);
				}
			})
			.on("upgrade", (req, socket, head) => {
				if (bare.shouldRoute(req)) {
					bare.routeUpgrade(req, socket, head);
				} else {
					wisp.routeRequest(req, socket, head);
				}
			});
	},
});

fastify.register(fastifyStatic, {
	root: join(__dirname, "./static"),
	decorateReply: false,
});
fastify.register(fastifyStatic, {
	root: join(__dirname, "./dist"),
	prefix: "/scram/",
	decorateReply: false,
});
fastify.register(fastifyStatic, {
	root: join(__dirname, "./assets"),
	prefix: "/assets/",
	decorateReply: false,
});
fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
});
fastify.register(fastifyStatic, {
	root: epoxyPath,
	prefix: "/epoxy/",
	decorateReply: false,
});
fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});
fastify.register(fastifyStatic, {
	root: bareModulePath,
	prefix: "/baremod/",
	decorateReply: false,
});

fastify.setNotFoundHandler((_request, reply) => {
	reply.code(404).send("not found");
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) || 1337 : 1337;

fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Scramjet proxy listening on http://0.0.0.0:${PORT}/`);
