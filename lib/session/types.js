"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustedState = exports.SessionState = void 0;
var SessionState;
(function (SessionState) {
    /**
     * A WHOAREYOU packet has been sent, and the Session is awaiting an Authentication response.
     */
    SessionState[SessionState["WhoAreYouSent"] = 0] = "WhoAreYouSent";
    /**
     * A RANDOM packet has been sent and the Session is awaiting a WHOAREYOU response.
     */
    SessionState[SessionState["RandomSent"] = 1] = "RandomSent";
    /**
     * An AuthMessage has been sent with a new set of generated keys. Once a response has been
     * received that we can decrypt, the session transitions to an established state, replacing
     * any current set of keys. No Session is currently active.
     */
    SessionState[SessionState["AwaitingResponse"] = 2] = "AwaitingResponse";
    /**
     * An established Session has received a WHOAREYOU. In this state, messages are sent
     * out with the established sessions keys and new encrypted messages are first attempted to
     * be decrypted with the established session keys, upon failure, the new keys are tried. If
     * the new keys are successful, the session keys are updated and the state progresses to
     * `Established`
     */
    SessionState[SessionState["EstablishedAwaitingResponse"] = 3] = "EstablishedAwaitingResponse";
    /**
     * A Session has been established and the ENR IP matches the source IP.
     */
    SessionState[SessionState["Established"] = 4] = "Established";
    /**
     * Processing has failed. Fatal error.
     */
    SessionState[SessionState["Poisoned"] = 5] = "Poisoned";
})(SessionState = exports.SessionState || (exports.SessionState = {}));
var TrustedState;
(function (TrustedState) {
    /**
     * The ENR socket address matches what is observed
     */
    TrustedState[TrustedState["Trusted"] = 0] = "Trusted";
    /**
     * The source socket address of the last message doesn't match the known ENR.
     * In this state, the service will respond to requests, but does not treat the node as
     * connected until the IP is updated to match the source IP.
     */
    TrustedState[TrustedState["Untrusted"] = 1] = "Untrusted";
})(TrustedState = exports.TrustedState || (exports.TrustedState = {}));
