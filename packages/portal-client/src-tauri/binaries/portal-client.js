import { SignableENR as b } from "@chainsafe/enr";
import { keys as O } from "@libp2p/crypto";
import { multiaddr as D } from "@multiformats/multiaddr";
import { formatBlockResponse as Y, PortalNetwork as A, TransportLayer as H, NetworkId as C } from "portalnetwork";
import P from "debug";
import { createSocket as Q } from "dgram";
const z = {
  mainnet: [
    "enr:-I24QO4X4ECNw19M51l3UYjQPq91dwy7FzEdOb43xEjvGnJMOU2cqD-KQ0FNZbpuzRWyQRiqLinAWw2qsgnRQ2guLt0EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQOdan7kE4_KU8yM1SNzw9OIrd-oQOlDBnz01fA2fz_1yoN1ZHCCE44",
    "enr:-I24QFm1w_fuMnMf4DsUr_PDVzn_Kn_PY6zQYsoWkJIk4evHUxO8OBacbdo4-7bAyvrXsYgCmOVgOQulvA_9ompMfc8EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQPeFHF3dY24vc0QgrRIM1vz3ZFnbmddmKLjhP34pxaD5YN1ZHCCE40",
    "enr:-I24QEkyh8nyn2PLMokMXzc_zpuiYxN2VHKrGfU7YI60K9_5YoGZsq-kSngZqLHeOWP3La-Pt5zaojutlsbbsbZ30dYEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQM-ccaM0TOFvYqC_RY_KhZNhEmWx8zdf6AQALhKyMVyboN1ZHCCE4w",
    "enr:-I24QDoMcfNTC3xoH_TSmALXS4WMybTM5SQrysabBxR1DG_UaXHVRHtpQdiGNhxqjHvfSONhnPETB8HorZYplIluDS0EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQOImp2idIf2UoY-GoY49pOeJAtqeeDLfb5VDxj94h_I44N1ZHCCE48",
    "enr:-I24QHZRM9Sd3UgUOdB443q3nX6NOUsg0VMyarcfD69z8M3SB1vW2hkqiPFczPpyY6wSUCcUeXTig75sC5fT4YnsL7MEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQMGuOLosx85PYtBn7rULoHY9EAtLmGTn7XWoIvFqvq4qIN1ZHCCE5A",
    "enr:-I24QGMQnf1FhP_-tjr7AdT3aJbowJeowuAktBOmoTaxu3WsNPlB1MaD704orcQO8kncLKhEQPOCTv1LSkU27AUldyoEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQLJhXByb3LmxHQaqgLDtIGUmpANXaBbFw3ybZWzGqb9-IN1ZHCCE4k",
    "enr:-I24QNw9C_xJvljho0dO27ug7-wZg7KCN1Mmqefdvqwxxqw3X-SLzBO3-KvzCbGFFJJMDn1be6Hd-Bf_TR3afjrwZ7UEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQJMpHmGj1xSP1O-Mffk_jYIHVcg6tY5_CjmWVg1gJEsPIN1ZHCCE4o",
    "enr:-I24QOz_tsZ8kOSU_zxXh2HOAxLyAIOeqHZP3Olzgsu73uMRTh8ul7sigT4Q1LaiT12Me2BFm5a4Izi6PCR0_Xe9AHUEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQIdyr0pquxuEW1mHQC0_j0mjB1fIfWZEZLlr7nfaKQXLYN1ZHCCE5E",
    "enr:-I24QD_1X6GriBdbJzOb5bgKqwrZyKHmemXo6OD5h6rmajHhcx0nTEMhqza6BaCA5DNXOi58wszHenV2pIXSTkvGaEsEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQNliw-242ySvi8lxyNOfrkfkC071-aS8iMAYd82EZ1SLYN1ZHCCE5I",
    "enr:-I24QMeElaS4lKvAtYQYmqBkvUc516OLykrLq0DNrw2kuB00EZVXAgFNGlvNz2U1gqVIMzgNg73RPK2j7UT6388HbdcEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQKb1jKQ-3sdzLAIL-a-KM4zTVnmgGIKLuKlh61UGoU8jYN1ZHCCE40",
    "enr:-I24QKRKw-asojN9E1YCyJnsyzERVqhnwWFXBobI7E91-LAqFx9IqouzXszzuuh_Q0WzbqFkR32pgCSmPezXcAPeFI0EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQMzvDQGNzKQSw3uGSZE86LqS5Xm5KYByI56NOZzTwWiRoN1ZHCCE4w",
    "enr:-I24QK_aSBXvKCAdMsrRioJDSPlJEl79fO5VX2JTrZEks2gbcrarbdfkWMMyEoS_2879w9bnJ14iC9hA6UWexjQ25IYEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQJxPJGDYLZ_QTU310eORFp6-NEs6ThGXpNULnAXPyiKy4N1ZHCCE4o",
    "enr:-I24QDT851x-fW12txAIkCOhq5guf9iMkY7qasRkxfECFsVGS9GnGf_xhy40rAB2aFV8M1kbAo0UMGs-vlDx1JJ1lxQEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9-KJc2VjcDI1NmsxoQKJUamKYO0FWvhv_-H4p1nLdyAqXZWGEzkb9Lk7NtvrR4N1ZHCCE4s",
    "enr:-I24QKa9-vJDAoEiZ4Eio0_z1_fH5OoCAY0mqIuBJ9iJOt9QXie9sAZbrrouToPwTu9hK1CukT7H-qBfdlzMVG2ryy8EY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQKHPt5CQ0D66ueTtSUqwGjfhscU_LiwS28QvJ0GgJFd-YN1ZHCCE4k",
    "enr:-I24QDs2O04xIlgNMLYzChw-YEcsOsVvkuAYVosX4CoDrFGlMbJQHfrodqYH7TvjZ8v1sNUaiG_7mD8LqFsMGhYf80UEY4d1IDAuMC4xgmlkgnY0gmlwhKRc9_OJc2VjcDI1NmsxoQO7DZE841adtMdh8qsDYCDyTjGLud1HZJg-P-OAbTDVz4N1ZHCCE4s"
  ]
};
function K(d) {
  return d && d.__esModule && Object.prototype.hasOwnProperty.call(d, "default") ? d.default : d;
}
var I = { exports: {} }, v;
function R() {
  return v || (v = 1, function(d) {
    var e = Object.prototype.hasOwnProperty, t = "~";
    function n() {
    }
    Object.create && (n.prototype = /* @__PURE__ */ Object.create(null), new n().__proto__ || (t = !1));
    function u(c, o, s) {
      this.fn = c, this.context = o, this.once = s || !1;
    }
    function y(c, o, s, i, p) {
      if (typeof s != "function")
        throw new TypeError("The listener must be a function");
      var f = new u(s, i || c, p), l = t ? t + o : o;
      return c._events[l] ? c._events[l].fn ? c._events[l] = [c._events[l], f] : c._events[l].push(f) : (c._events[l] = f, c._eventsCount++), c;
    }
    function g(c, o) {
      --c._eventsCount === 0 ? c._events = new n() : delete c._events[o];
    }
    function a() {
      this._events = new n(), this._eventsCount = 0;
    }
    a.prototype.eventNames = function() {
      var o = [], s, i;
      if (this._eventsCount === 0) return o;
      for (i in s = this._events)
        e.call(s, i) && o.push(t ? i.slice(1) : i);
      return Object.getOwnPropertySymbols ? o.concat(Object.getOwnPropertySymbols(s)) : o;
    }, a.prototype.listeners = function(o) {
      var s = t ? t + o : o, i = this._events[s];
      if (!i) return [];
      if (i.fn) return [i.fn];
      for (var p = 0, f = i.length, l = new Array(f); p < f; p++)
        l[p] = i[p].fn;
      return l;
    }, a.prototype.listenerCount = function(o) {
      var s = t ? t + o : o, i = this._events[s];
      return i ? i.fn ? 1 : i.length : 0;
    }, a.prototype.emit = function(o, s, i, p, f, l) {
      var w = t ? t + o : o;
      if (!this._events[w]) return !1;
      var r = this._events[w], m = arguments.length, k, h;
      if (r.fn) {
        switch (r.once && this.removeListener(o, r.fn, void 0, !0), m) {
          case 1:
            return r.fn.call(r.context), !0;
          case 2:
            return r.fn.call(r.context, s), !0;
          case 3:
            return r.fn.call(r.context, s, i), !0;
          case 4:
            return r.fn.call(r.context, s, i, p), !0;
          case 5:
            return r.fn.call(r.context, s, i, p, f), !0;
          case 6:
            return r.fn.call(r.context, s, i, p, f, l), !0;
        }
        for (h = 1, k = new Array(m - 1); h < m; h++)
          k[h - 1] = arguments[h];
        r.fn.apply(r.context, k);
      } else {
        var M = r.length, E;
        for (h = 0; h < M; h++)
          switch (r[h].once && this.removeListener(o, r[h].fn, void 0, !0), m) {
            case 1:
              r[h].fn.call(r[h].context);
              break;
            case 2:
              r[h].fn.call(r[h].context, s);
              break;
            case 3:
              r[h].fn.call(r[h].context, s, i);
              break;
            case 4:
              r[h].fn.call(r[h].context, s, i, p);
              break;
            default:
              if (!k) for (E = 1, k = new Array(m - 1); E < m; E++)
                k[E - 1] = arguments[E];
              r[h].fn.apply(r[h].context, k);
          }
      }
      return !0;
    }, a.prototype.on = function(o, s, i) {
      return y(this, o, s, i, !1);
    }, a.prototype.once = function(o, s, i) {
      return y(this, o, s, i, !0);
    }, a.prototype.removeListener = function(o, s, i, p) {
      var f = t ? t + o : o;
      if (!this._events[f]) return this;
      if (!s)
        return g(this, f), this;
      var l = this._events[f];
      if (l.fn)
        l.fn === s && (!p || l.once) && (!i || l.context === i) && g(this, f);
      else {
        for (var w = 0, r = [], m = l.length; w < m; w++)
          (l[w].fn !== s || p && !l[w].once || i && l[w].context !== i) && r.push(l[w]);
        r.length ? this._events[f] = r.length === 1 ? r[0] : r : g(this, f);
      }
      return this;
    }, a.prototype.removeAllListeners = function(o) {
      var s;
      return o ? (s = t ? t + o : o, this._events[s] && g(this, s)) : (this._events = new n(), this._eventsCount = 0), this;
    }, a.prototype.off = a.prototype.removeListener, a.prototype.addListener = a.prototype.on, a.prefixed = t, a.EventEmitter = a, d.exports = a;
  }(I)), I.exports;
}
var L = R();
const S = /* @__PURE__ */ K(L), x = 1460;
class B extends S {
  emit(e, ...t) {
    return super.emit(e, ...t);
  }
  socket;
  portal;
  bindAddress;
  udpPort;
  rpcMethodRegistry = {};
  isRunning = !1;
  constructor(e, t, n) {
    super(), this.portal = e, this.bindAddress = t, this.udpPort = n, this.socket = Q({
      recvBufferSize: 16 * x,
      sendBufferSize: x,
      type: "udp4"
    }), this.registerRPCMethods(), this.socket.on("message", this.handleMessage.bind(this)), this.socket.on("error", (u) => {
      console.error("UDP Socket Error:", u), this.emit("error", u);
    });
  }
  registerRPCMethods() {
    this.rpcMethodRegistry = {
      portal_findNodes: this.handleFindNodes.bind(this),
      eth_getBlockByHash: this.handleEthGetBlockByHash.bind(this),
      eth_getBlockByNumber: this.handleEthGetBlockByNumber.bind(this)
    };
  }
  async start() {
    return new Promise((e, t) => {
      this.socket.bind(this.udpPort, this.bindAddress, () => {
        this.isRunning = !0, console.log(`UDP Server listening on ${this.bindAddress}:${this.udpPort}`), e();
      }), this.socket.on("error", t);
    });
  }
  async handleMessage(e, t) {
    try {
      const n = JSON.parse(e.toString());
      if (console.log(`Received request from ${t.address}:${t.port}:`, n), !n.method)
        throw new Error("Invalid request format - missing method");
      let u;
      if (this.rpcMethodRegistry[n.method])
        try {
          const g = await this.rpcMethodRegistry[n.method](n.params || []);
          u = Y(g, !1);
        } catch (g) {
          u = {
            jsonrpc: "2.0",
            error: {
              code: -32e3,
              message: g instanceof Error ? g.message : "Unknown error"
            },
            id: n.id
          };
        }
      else
        u = {
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method not found: ${n.method}`
          },
          id: n.id
        };
      console.log("Response (before serialization):", u);
      const y = JSON.stringify(u, (g, a) => typeof a == "bigint" ? a.toString() : a);
      console.log("serialized response ", y), this.socket.send(y, t.port, t.address, (g) => {
        g && console.error("Error sending response:", g);
      });
    } catch (n) {
      console.error("Error handling message:", n);
      const u = {
        error: n instanceof Error ? n.message : "Unknown error",
        id: null
      }, y = JSON.stringify(u, (g, a) => typeof a == "bigint" ? a.toString() : a);
      this.socket.send(y, t.port, t.address);
    }
  }
  async handleFindNodes(e) {
    if (!e || !e[0])
      throw new Error("Missing nodeId parameter");
    if (!this.portal)
      throw new Error("Node not initialized");
    return (await this.portal.discv5.findNode(e[0])).map((n) => {
      var u;
      return console.log(n), {
        nodeId: n.nodeId,
        multiaddr: (u = n.getLocationMultiaddr("udp")) == null ? void 0 : u.toString()
      };
    });
  }
  async handleEthGetBlockByHash(e) {
    if (console.log("here inside handler ..."), !e || !e[0])
      throw new Error("Missing Block Hash parameter");
    if (!this.portal)
      throw new Error("Node not initialized");
    return await this.portal.ETH.getBlockByHash(e[0], !1);
  }
  async handleEthGetBlockByNumber(e) {
    if (console.log("here inside handler ...", e), !e || !e[0])
      throw new Error("Missing Block Number parameter");
    if (!this.portal)
      throw new Error("Node not initialized");
    return await this.portal.ETH.getBlockByNumber(e[0], !1);
  }
  async stop() {
    return new Promise((e) => {
      if (!this.isRunning) {
        e();
        return;
      }
      const t = () => {
        this.isRunning = !1, e();
      };
      if (!this.isRunning) {
        t();
        return;
      }
      this.socket.once("close", t);
      try {
        this.socket.close(), this.socket.unref();
      } catch (n) {
        console.warn("Error while closing UDP socket:", n), t();
      }
    });
  }
}
const _ = "PortalClient";
class J {
  node;
  historyNetwork;
  stateNetwork;
  enr;
  udpHandler;
  logger = P(_);
  isInitialized = !1;
  async init(e = 9090, t = 8545) {
    this.isInitialized && await this.shutdown();
    try {
      if (e <= 0)
        throw new Error("Invalid bind port number");
      const n = await O.generateKeyPair("secp256k1");
      this.enr = b.createFromPrivateKey(n);
      const u = D(`/ip4/0.0.0.0/udp/${e}`);
      this.enr.setLocationMultiaddr(u), this.node = await A.create({
        transport: H.NODE,
        supportedNetworks: [
          { networkId: C.HistoryNetwork },
          { networkId: C.StateNetwork }
        ],
        config: {
          enr: this.enr,
          bindAddrs: { ip4: u },
          privateKey: n
        },
        bootnodes: z.mainnet
      }), this.historyNetwork = this.node.network()["0x500b"], this.stateNetwork = this.node.network()["0x500a"], this.udpHandler = new B(this.node, "127.0.0.1", t), await this.node.start(), await this.udpHandler.start(), this.node.enableLog(_), this.isInitialized = !0, this.logger("Portal Network initialized successfully"), this.logger(`Bind Port: ${e}`), this.logger("History Network status:", !!this.historyNetwork), this.logger("State Network status:", !!this.stateNetwork), this.logger(this.node);
    } catch (n) {
      throw this.logger("Portal Network initialization failed:", n), await this.cleanup(), n;
    }
  }
  async cleanup() {
    try {
      this.udpHandler && await this.udpHandler.stop(), this.node && await this.node.stop();
    } catch (e) {
      this.logger("Cleanup error:", e);
    }
    this.isInitialized = !1, this.node = void 0, this.udpHandler = void 0;
  }
  async shutdown() {
    this.logger("Shutting down Portal Network node..."), await this.cleanup();
  }
  getHistoryNetwork() {
    return this.historyNetwork;
  }
  getStateNetwork() {
    return this.stateNetwork;
  }
  getNode() {
    return this.node;
  }
  async bootstrap() {
    var e;
    await ((e = this.node) == null ? void 0 : e.bootstrap());
  }
}
let N;
async function q(d, e) {
  return N && await N.shutdown(), N = new J(), await N.init(d, e), N;
}
async function Z() {
  let d;
  try {
    const e = parseInt(process.env.BIND_PORT || "9090"), t = parseInt(process.env.UDP_PORT || "8545");
    d = await q(e, t);
    const n = async () => {
      d && await d.shutdown(), process.exit(0);
    };
    process.on("SIGINT", n), process.on("SIGTERM", n), console.log(`Portal Network started on bind port: ${e}`);
  } catch (e) {
    console.error("Error initializing Portal Network:", e), d && await d.shutdown(), process.exit(1);
  }
}
Z().catch(async (d) => {
  console.error("Fatal error:", d), process.exit(1);
});
export {
  J as PortalClient
};
