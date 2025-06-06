;(() => {
  const Se = Object.create
  const re = Object.defineProperty
  const we = Object.getOwnPropertyDescriptor
  const Te = Object.getOwnPropertyNames
  const ke = Object.getPrototypeOf,
    Qe = Object.prototype.hasOwnProperty
  const Pe = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports)
  const Ie = (t, e, r, n) => {
    if ((e && typeof e === 'object') || typeof e === 'function')
      for (const i of Te(e))
        !Qe.call(t, i) &&
          i !== r &&
          re(t, i, { get: () => e[i], enumerable: !(n = we(e, i)) || n.enumerable })
    return t
  }
  const Ce = (t, e, r) => (
    (r = t != null ? Se(ke(t)) : {}),
    Ie(e || !t || !t.__esModule ? re(r, 'default', { value: t, enumerable: !0 }) : r, t)
  )
  const ae = Pe((se, oe) => {
    ;(function () {
      const t = (e) => {
        const r = new t.Builder()
        return (
          r.pipeline.add(t.trimmer, t.stopWordFilter, t.stemmer),
          r.searchPipeline.add(t.stemmer),
          e.call(r, r),
          r.build()
        )
      }
      t.version = '2.3.9'
      ;(t.utils = {}),
        (t.utils.warn = ((e) => (r) => {
          e.console && console.warn && console.warn(r)
        })(this)),
        (t.utils.asString = (e) => (e == null ? '' : e.toString())),
        (t.utils.clone = (e) => {
          if (e == null) return e
          for (let r = Object.create(null), n = Object.keys(e), i = 0; i < n.length; i++) {
            const s = n[i],
              o = e[s]
            if (Array.isArray(o)) {
              r[s] = o.slice()
              continue
            }
            if (typeof o === 'string' || typeof o === 'number' || typeof o === 'boolean') {
              r[s] = o
              continue
            }
            throw new TypeError('clone is not deep and does not support nested objects')
          }
          return r
        }),
        (t.FieldRef = function (e, r, n) {
          ;(this.docRef = e), (this.fieldName = r), (this._stringValue = n)
        }),
        (t.FieldRef.joiner = '/'),
        (t.FieldRef.fromString = (e) => {
          const r = e.indexOf(t.FieldRef.joiner)
          if (r === -1) throw 'malformed field ref string'
          const n = e.slice(0, r),
            i = e.slice(r + 1)
          return new t.FieldRef(i, n, e)
        }),
        (t.FieldRef.prototype.toString = function () {
          return (
            this._stringValue == null &&
              (this._stringValue = this.fieldName + t.FieldRef.joiner + this.docRef),
            this._stringValue
          )
        })
      ;(t.Set = function (e) {
        if (((this.elements = Object.create(null)), e)) {
          this.length = e.length
          for (let r = 0; r < this.length; r++) this.elements[e[r]] = !0
        } else this.length = 0
      }),
        (t.Set.complete = {
          intersect: (e) => e,
          union: function () {
            return this
          },
          contains: () => !0,
        }),
        (t.Set.empty = {
          intersect: function () {
            return this
          },
          union: (e) => e,
          contains: () => !1,
        }),
        (t.Set.prototype.contains = function (e) {
          return !!this.elements[e]
        }),
        (t.Set.prototype.intersect = function (e) {
          let r,
            n,
            i,
            s = []
          if (e === t.Set.complete) return this
          if (e === t.Set.empty) return e
          this.length < e.length ? ((r = this), (n = e)) : ((r = e), (n = this)),
            (i = Object.keys(r.elements))
          for (let o = 0; o < i.length; o++) {
            const a = i[o]
            a in n.elements && s.push(a)
          }
          return new t.Set(s)
        }),
        (t.Set.prototype.union = function (e) {
          return e === t.Set.complete
            ? t.Set.complete
            : e === t.Set.empty
              ? this
              : new t.Set(Object.keys(this.elements).concat(Object.keys(e.elements)))
        }),
        (t.idf = (e, r) => {
          let n = 0
          for (const i in e) i !== '_index' && (n += Object.keys(e[i]).length)
          const s = (r - n + 0.5) / (n + 0.5)
          return Math.log(1 + Math.abs(s))
        }),
        (t.Token = function (e, r) {
          ;(this.str = e || ''), (this.metadata = r || {})
        }),
        (t.Token.prototype.toString = function () {
          return this.str
        }),
        (t.Token.prototype.update = function (e) {
          return (this.str = e(this.str, this.metadata)), this
        }),
        (t.Token.prototype.clone = function (e) {
          return (e = e || ((r) => r)), new t.Token(e(this.str, this.metadata), this.metadata)
        })
      ;(t.tokenizer = (e, r) => {
        if (e == null || e == null) return []
        if (Array.isArray(e))
          return e.map((m) => new t.Token(t.utils.asString(m).toLowerCase(), t.utils.clone(r)))
        for (let n = e.toString().toLowerCase(), i = n.length, s = [], o = 0, a = 0; o <= i; o++) {
          const l = n.charAt(o),
            u = o - a
          if (l.match(t.tokenizer.separator) || o === i) {
            if (u > 0) {
              const d = t.utils.clone(r) || {}
              ;(d.position = [a, u]), (d.index = s.length), s.push(new t.Token(n.slice(a, o), d))
            }
            a = o + 1
          }
        }
        return s
      }),
        (t.tokenizer.separator = /[\s\-]+/)
      ;(t.Pipeline = function () {
        this._stack = []
      }),
        (t.Pipeline.registeredFunctions = Object.create(null)),
        (t.Pipeline.registerFunction = function (e, r) {
          r in this.registeredFunctions &&
            t.utils.warn('Overwriting existing registered function: ' + r),
            (e.label = r),
            (t.Pipeline.registeredFunctions[e.label] = e)
        }),
        (t.Pipeline.warnIfFunctionNotRegistered = function (e) {
          const r = e.label && e.label in this.registeredFunctions
          r ||
            t.utils.warn(
              `Function is not registered with pipeline. This may cause problems when serialising the index.
`,
              e,
            )
        }),
        (t.Pipeline.load = (e) => {
          const r = new t.Pipeline()
          return (
            e.forEach((n) => {
              const i = t.Pipeline.registeredFunctions[n]
              if (i) r.add(i)
              else throw new Error('Cannot load unregistered function: ' + n)
            }),
            r
          )
        }),
        (t.Pipeline.prototype.add = function () {
          const e = Array.prototype.slice.call(arguments)
          e.forEach(function (r) {
            t.Pipeline.warnIfFunctionNotRegistered(r), this._stack.push(r)
          }, this)
        }),
        (t.Pipeline.prototype.after = function (e, r) {
          t.Pipeline.warnIfFunctionNotRegistered(r)
          let n = this._stack.indexOf(e)
          if (n === -1) throw new Error('Cannot find existingFn')
          ;(n = n + 1), this._stack.splice(n, 0, r)
        }),
        (t.Pipeline.prototype.before = function (e, r) {
          t.Pipeline.warnIfFunctionNotRegistered(r)
          const n = this._stack.indexOf(e)
          if (n === -1) throw new Error('Cannot find existingFn')
          this._stack.splice(n, 0, r)
        }),
        (t.Pipeline.prototype.remove = function (e) {
          const r = this._stack.indexOf(e)
          r !== -1 && this._stack.splice(r, 1)
        }),
        (t.Pipeline.prototype.run = function (e) {
          for (let r = this._stack.length, n = 0; n < r; n++) {
            for (let i = this._stack[n], s = [], o = 0; o < e.length; o++) {
              const a = i(e[o], o, e)
              if (!(a == null || a === ''))
                if (Array.isArray(a)) for (let l = 0; l < a.length; l++) s.push(a[l])
                else s.push(a)
            }
            e = s
          }
          return e
        }),
        (t.Pipeline.prototype.runString = function (e, r) {
          const n = new t.Token(e, r)
          return this.run([n]).map((i) => i.toString())
        }),
        (t.Pipeline.prototype.reset = function () {
          this._stack = []
        }),
        (t.Pipeline.prototype.toJSON = function () {
          return this._stack.map((e) => (t.Pipeline.warnIfFunctionNotRegistered(e), e.label))
        })
      ;(t.Vector = function (e) {
        ;(this._magnitude = 0), (this.elements = e || [])
      }),
        (t.Vector.prototype.positionForIndex = function (e) {
          if (this.elements.length === 0) return 0
          for (
            let r = 0,
              n = this.elements.length / 2,
              i = n - r,
              s = Math.floor(i / 2),
              o = this.elements[s * 2];
            i > 1 && (o < e && (r = s), o > e && (n = s), o !== e);
          )
            (i = n - r), (s = r + Math.floor(i / 2)), (o = this.elements[s * 2])
          if (o === e || o > e) return s * 2
          if (o < e) return (s + 1) * 2
        }),
        (t.Vector.prototype.insert = function (e, r) {
          this.upsert(e, r, () => {
            throw 'duplicate index'
          })
        }),
        (t.Vector.prototype.upsert = function (e, r, n) {
          this._magnitude = 0
          const i = this.positionForIndex(e)
          this.elements[i] === e
            ? (this.elements[i + 1] = n(this.elements[i + 1], r))
            : this.elements.splice(i, 0, e, r)
        }),
        (t.Vector.prototype.magnitude = function () {
          if (this._magnitude) return this._magnitude
          for (let e = 0, r = this.elements.length, n = 1; n < r; n += 2) {
            const i = this.elements[n]
            e += i * i
          }
          return (this._magnitude = Math.sqrt(e))
        }),
        (t.Vector.prototype.dot = function (e) {
          for (
            let r = 0,
              n = this.elements,
              i = e.elements,
              s = n.length,
              o = i.length,
              a = 0,
              l = 0,
              u = 0,
              d = 0;
            u < s && d < o;
          )
            (a = n[u]),
              (l = i[d]),
              a < l
                ? (u += 2)
                : a > l
                  ? (d += 2)
                  : a === l && ((r += n[u + 1] * i[d + 1]), (u += 2), (d += 2))
          return r
        }),
        (t.Vector.prototype.similarity = function (e) {
          return this.dot(e) / this.magnitude() || 0
        }),
        (t.Vector.prototype.toArray = function () {
          for (
            let e = new Array(this.elements.length / 2), r = 1, n = 0;
            r < this.elements.length;
            r += 2, n++
          )
            e[n] = this.elements[r]
          return e
        }),
        (t.Vector.prototype.toJSON = function () {
          return this.elements
        })
      ;(t.stemmer = (() => {
        const e = {
            ational: 'ate',
            tional: 'tion',
            enci: 'ence',
            anci: 'ance',
            izer: 'ize',
            bli: 'ble',
            alli: 'al',
            entli: 'ent',
            eli: 'e',
            ousli: 'ous',
            ization: 'ize',
            ation: 'ate',
            ator: 'ate',
            alism: 'al',
            iveness: 'ive',
            fulness: 'ful',
            ousness: 'ous',
            aliti: 'al',
            iviti: 'ive',
            biliti: 'ble',
            logi: 'log',
          },
          r = { icate: 'ic', ative: '', alize: 'al', iciti: 'ic', ical: 'ic', ful: '', ness: '' },
          n = '[^aeiou]',
          i = '[aeiouy]',
          s = n + '[^aeiouy]*',
          o = i + '[aeiou]*',
          a = '^(' + s + ')?' + o + s,
          l = '^(' + s + ')?' + o + s + '(' + o + ')?$',
          u = '^(' + s + ')?' + o + s + o + s,
          d = '^(' + s + ')?' + i,
          m = new RegExp(a),
          y = new RegExp(u),
          b = new RegExp(l),
          g = new RegExp(d),
          E = /^(.+?)(ss|i)es$/,
          f = /^(.+?)([^s])s$/,
          p = /^(.+?)eed$/,
          w = /^(.+?)(ed|ing)$/,
          S = /.$/,
          k = /(at|bl|iz)$/,
          _ = /([^aeiouylsz])\1$/,
          B = new RegExp('^' + s + i + '[^aeiouwxy]$'),
          A = /^(.+?[^aeiou])y$/,
          j =
            /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/,
          q = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/,
          V = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/,
          $ = /^(.+?)(s|t)(ion)$/,
          I = /^(.+?)e$/,
          z = /ll$/,
          W = new RegExp('^' + s + i + '[^aeiouwxy]$'),
          H = (c) => {
            let v, C, T, h, x, O, F
            if (c.length < 3) return c
            if (
              ((T = c.substr(0, 1)),
              T === 'y' && (c = T.toUpperCase() + c.substr(1)),
              (h = E),
              (x = f),
              h.test(c) ? (c = c.replace(h, '$1$2')) : x.test(c) && (c = c.replace(x, '$1$2')),
              (h = p),
              (x = w),
              h.test(c))
            ) {
              const L = h.exec(c)
              ;(h = m), h.test(L[1]) && ((h = S), (c = c.replace(h, '')))
            } else if (x.test(c)) {
              const L = x.exec(c)
              ;(v = L[1]),
                (x = g),
                x.test(v) &&
                  ((c = v),
                  (x = k),
                  (O = _),
                  (F = B),
                  x.test(c)
                    ? (c = c + 'e')
                    : O.test(c)
                      ? ((h = S), (c = c.replace(h, '')))
                      : F.test(c) && (c = c + 'e'))
            }
            if (((h = A), h.test(c))) {
              const L = h.exec(c)
              ;(v = L[1]), (c = v + 'i')
            }
            if (((h = j), h.test(c))) {
              const L = h.exec(c)
              ;(v = L[1]), (C = L[2]), (h = m), h.test(v) && (c = v + e[C])
            }
            if (((h = q), h.test(c))) {
              const L = h.exec(c)
              ;(v = L[1]), (C = L[2]), (h = m), h.test(v) && (c = v + r[C])
            }
            if (((h = V), (x = $), h.test(c))) {
              const L = h.exec(c)
              ;(v = L[1]), (h = y), h.test(v) && (c = v)
            } else if (x.test(c)) {
              const L = x.exec(c)
              ;(v = L[1] + L[2]), (x = y), x.test(v) && (c = v)
            }
            if (((h = I), h.test(c))) {
              const L = h.exec(c)
              ;(v = L[1]),
                (h = y),
                (x = b),
                (O = W),
                (h.test(v) || (x.test(v) && !O.test(v))) && (c = v)
            }
            return (
              (h = z),
              (x = y),
              h.test(c) && x.test(c) && ((h = S), (c = c.replace(h, ''))),
              T === 'y' && (c = T.toLowerCase() + c.substr(1)),
              c
            )
          }
        return (R) => R.update(H)
      })()),
        t.Pipeline.registerFunction(t.stemmer, 'stemmer')
      ;(t.generateStopWordFilter = (e) => {
        const r = e.reduce((n, i) => ((n[i] = i), n), {})
        return (n) => {
          if (n && r[n.toString()] !== n.toString()) return n
        }
      }),
        (t.stopWordFilter = t.generateStopWordFilter([
          'a',
          'able',
          'about',
          'across',
          'after',
          'all',
          'almost',
          'also',
          'am',
          'among',
          'an',
          'and',
          'any',
          'are',
          'as',
          'at',
          'be',
          'because',
          'been',
          'but',
          'by',
          'can',
          'cannot',
          'could',
          'dear',
          'did',
          'do',
          'does',
          'either',
          'else',
          'ever',
          'every',
          'for',
          'from',
          'get',
          'got',
          'had',
          'has',
          'have',
          'he',
          'her',
          'hers',
          'him',
          'his',
          'how',
          'however',
          'i',
          'if',
          'in',
          'into',
          'is',
          'it',
          'its',
          'just',
          'least',
          'let',
          'like',
          'likely',
          'may',
          'me',
          'might',
          'most',
          'must',
          'my',
          'neither',
          'no',
          'nor',
          'not',
          'of',
          'off',
          'often',
          'on',
          'only',
          'or',
          'other',
          'our',
          'own',
          'rather',
          'said',
          'say',
          'says',
          'she',
          'should',
          'since',
          'so',
          'some',
          'than',
          'that',
          'the',
          'their',
          'them',
          'then',
          'there',
          'these',
          'they',
          'this',
          'tis',
          'to',
          'too',
          'twas',
          'us',
          'wants',
          'was',
          'we',
          'were',
          'what',
          'when',
          'where',
          'which',
          'while',
          'who',
          'whom',
          'why',
          'will',
          'with',
          'would',
          'yet',
          'you',
          'your',
        ])),
        t.Pipeline.registerFunction(t.stopWordFilter, 'stopWordFilter')
      ;(t.trimmer = (e) => e.update((r) => r.replace(/^\W+/, '').replace(/\W+$/, ''))),
        t.Pipeline.registerFunction(t.trimmer, 'trimmer')
      ;(t.TokenSet = function () {
        ;(this.final = !1),
          (this.edges = {}),
          (this.id = t.TokenSet._nextId),
          (t.TokenSet._nextId += 1)
      }),
        (t.TokenSet._nextId = 1),
        (t.TokenSet.fromArray = (e) => {
          for (let r = new t.TokenSet.Builder(), n = 0, i = e.length; n < i; n++) r.insert(e[n])
          return r.finish(), r.root
        }),
        (t.TokenSet.fromClause = (e) =>
          'editDistance' in e
            ? t.TokenSet.fromFuzzyString(e.term, e.editDistance)
            : t.TokenSet.fromString(e.term)),
        (t.TokenSet.fromFuzzyString = (e, r) => {
          for (const n = new t.TokenSet(), i = [{ node: n, editsRemaining: r, str: e }]; i.length; ) {
            const s = i.pop()
            if (s.str.length > 0) {
              let o = s.str.charAt(0),
                a
              o in s.node.edges
                ? (a = s.node.edges[o])
                : ((a = new t.TokenSet()), (s.node.edges[o] = a)),
                s.str.length === 1 && (a.final = !0),
                i.push({ node: a, editsRemaining: s.editsRemaining, str: s.str.slice(1) })
            }
            if (s.editsRemaining !== 0) {
              if ('*' in s.node.edges) const l = s.node.edges['*']
              else {
                const l = new t.TokenSet()
                s.node.edges['*'] = l
              }
              if (
                (s.str.length === 0 && (l.final = !0),
                i.push({ node: l, editsRemaining: s.editsRemaining - 1, str: s.str }),
                s.str.length > 1 &&
                  i.push({
                    node: s.node,
                    editsRemaining: s.editsRemaining - 1,
                    str: s.str.slice(1),
                  }),
                s.str.length === 1 && (s.node.final = !0),
                s.str.length >= 1)
              ) {
                if ('*' in s.node.edges) const u = s.node.edges['*']
                else {
                  const u = new t.TokenSet()
                  s.node.edges['*'] = u
                }
                s.str.length === 1 && (u.final = !0),
                  i.push({ node: u, editsRemaining: s.editsRemaining - 1, str: s.str.slice(1) })
              }
              if (s.str.length > 1) {
                let d = s.str.charAt(0),
                  m = s.str.charAt(1),
                  y
                m in s.node.edges
                  ? (y = s.node.edges[m])
                  : ((y = new t.TokenSet()), (s.node.edges[m] = y)),
                  s.str.length === 1 && (y.final = !0),
                  i.push({ node: y, editsRemaining: s.editsRemaining - 1, str: d + s.str.slice(2) })
              }
            }
          }
          return n
        }),
        (t.TokenSet.fromString = (e) => {
          for (let r = new t.TokenSet(), n = r, i = 0, s = e.length; i < s; i++) {
            const o = e[i],
              a = i === s - 1
            if (o === '*') (r.edges[o] = r), (r.final = a)
            else {
              const l = new t.TokenSet()
              ;(l.final = a), (r.edges[o] = l), (r = l)
            }
          }
          return n
        }),
        (t.TokenSet.prototype.toArray = function () {
          for (const e = [], r = [{ prefix: '', node: this }]; r.length; ) {
            const n = r.pop(),
              i = Object.keys(n.node.edges),
              s = i.length
            n.node.final && (n.prefix.charAt(0), e.push(n.prefix))
            for (let o = 0; o < s; o++) {
              const a = i[o]
              r.push({ prefix: n.prefix.concat(a), node: n.node.edges[a] })
            }
          }
          return e
        }),
        (t.TokenSet.prototype.toString = function () {
          if (this._str) return this._str
          for (
            let e = this.final ? '1' : '0', r = Object.keys(this.edges).sort(), n = r.length, i = 0;
            i < n;
            i++
          ) {
            const s = r[i],
              o = this.edges[s]
            e = e + s + o.id
          }
          return e
        }),
        (t.TokenSet.prototype.intersect = function (e) {
          for (
            let r = new t.TokenSet(), n = void 0, i = [{ qNode: e, output: r, node: this }];
            i.length;
          ) {
            n = i.pop()
            for (
              let s = Object.keys(n.qNode.edges),
                o = s.length,
                a = Object.keys(n.node.edges),
                l = a.length,
                u = 0;
              u < o;
              u++
            )
              for (let d = s[u], m = 0; m < l; m++) {
                const y = a[m]
                if (y === d || d === '*') {
                  let b = n.node.edges[y],
                    g = n.qNode.edges[d],
                    E = b.final && g.final,
                    f = void 0
                  y in n.output.edges
                    ? ((f = n.output.edges[y]), (f.final = f.final || E))
                    : ((f = new t.TokenSet()), (f.final = E), (n.output.edges[y] = f)),
                    i.push({ qNode: g, output: f, node: b })
                }
              }
          }
          return r
        }),
        (t.TokenSet.Builder = function () {
          ;(this.previousWord = ''),
            (this.root = new t.TokenSet()),
            (this.uncheckedNodes = []),
            (this.minimizedNodes = {})
        }),
        (t.TokenSet.Builder.prototype.insert = function (e) {
          let r,
            n = 0
          if (e < this.previousWord) throw new Error('Out of order word insertion')
          for (
            let i = 0;
            i < e.length && i < this.previousWord.length && e[i] === this.previousWord[i];
            i++
          )
            n++
          this.minimize(n),
            this.uncheckedNodes.length === 0
              ? (r = this.root)
              : (r = this.uncheckedNodes[this.uncheckedNodes.length - 1].child)
          for (let i = n; i < e.length; i++) {
            const s = new t.TokenSet(),
              o = e[i]
            ;(r.edges[o] = s), this.uncheckedNodes.push({ parent: r, char: o, child: s }), (r = s)
          }
          ;(r.final = !0), (this.previousWord = e)
        }),
        (t.TokenSet.Builder.prototype.finish = function () {
          this.minimize(0)
        }),
        (t.TokenSet.Builder.prototype.minimize = function (e) {
          for (let r = this.uncheckedNodes.length - 1; r >= e; r--) {
            const n = this.uncheckedNodes[r],
              i = n.child.toString()
            i in this.minimizedNodes
              ? (n.parent.edges[n.char] = this.minimizedNodes[i])
              : ((n.child._str = i), (this.minimizedNodes[i] = n.child)),
              this.uncheckedNodes.pop()
          }
        })
      ;(t.Index = function (e) {
        ;(this.invertedIndex = e.invertedIndex),
          (this.fieldVectors = e.fieldVectors),
          (this.tokenSet = e.tokenSet),
          (this.fields = e.fields),
          (this.pipeline = e.pipeline)
      }),
        (t.Index.prototype.search = function (e) {
          return this.query((r) => {
            const n = new t.QueryParser(e, r)
            n.parse()
          })
        }),
        (t.Index.prototype.query = function (e) {
          for (
            let r = new t.Query(this.fields),
              n = Object.create(null),
              i = Object.create(null),
              s = Object.create(null),
              o = Object.create(null),
              a = Object.create(null),
              l = 0;
            l < this.fields.length;
            l++
          )
            i[this.fields[l]] = new t.Vector()
          e.call(r, r)
          for (let l = 0; l < r.clauses.length; l++) {
            let u = r.clauses[l],
              d = null,
              m = t.Set.empty
            u.usePipeline
              ? (d = this.pipeline.runString(u.term, { fields: u.fields }))
              : (d = [u.term])
            for (let y = 0; y < d.length; y++) {
              const b = d[y]
              u.term = b
              const g = t.TokenSet.fromClause(u),
                E = this.tokenSet.intersect(g).toArray()
              if (E.length === 0 && u.presence === t.Query.presence.REQUIRED) {
                for (let f = 0; f < u.fields.length; f++) {
                  const p = u.fields[f]
                  o[p] = t.Set.empty
                }
                break
              }
              for (let w = 0; w < E.length; w++)
                for (
                  let S = E[w], k = this.invertedIndex[S], _ = k._index, f = 0;
                  f < u.fields.length;
                  f++
                ) {
                  const p = u.fields[f],
                    B = k[p],
                    A = Object.keys(B),
                    j = S + '/' + p,
                    q = new t.Set(A)
                  if (
                    (u.presence === t.Query.presence.REQUIRED &&
                      ((m = m.union(q)), o[p] === void 0 && (o[p] = t.Set.complete)),
                    u.presence === t.Query.presence.PROHIBITED)
                  ) {
                    a[p] === void 0 && (a[p] = t.Set.empty), (a[p] = a[p].union(q))
                    continue
                  }
                  if ((i[p].upsert(_, u.boost, (Ee, be) => Ee + be), !s[j])) {
                    for (let V = 0; V < A.length; V++) {
                      let $ = A[V],
                        I = new t.FieldRef($, p),
                        z = B[$],
                        W
                      ;(W = n[I]) === void 0 ? (n[I] = new t.MatchData(S, p, z)) : W.add(S, p, z)
                    }
                    s[j] = !0
                  }
                }
            }
            if (u.presence === t.Query.presence.REQUIRED)
              for (let f = 0; f < u.fields.length; f++) {
                const p = u.fields[f]
                o[p] = o[p].intersect(m)
              }
          }
          for (let H = t.Set.complete, R = t.Set.empty, l = 0; l < this.fields.length; l++) {
            const p = this.fields[l]
            o[p] && (H = H.intersect(o[p])), a[p] && (R = R.union(a[p]))
          }
          let c = Object.keys(n),
            v = [],
            C = Object.create(null)
          if (r.isNegated()) {
            c = Object.keys(this.fieldVectors)
            for (let l = 0; l < c.length; l++) {
              const I = c[l],
                T = t.FieldRef.fromString(I)
              n[I] = new t.MatchData()
            }
          }
          for (let l = 0; l < c.length; l++) {
            const T = t.FieldRef.fromString(c[l]),
              h = T.docRef
            if (H.contains(h) && !R.contains(h)) {
              let x = this.fieldVectors[T],
                O = i[T.fieldName].similarity(x),
                F
              if ((F = C[h]) !== void 0) (F.score += O), F.matchData.combine(n[T])
              else {
                const L = { ref: h, score: O, matchData: n[T] }
                ;(C[h] = L), v.push(L)
              }
            }
          }
          return v.sort((xe, Le) => Le.score - xe.score)
        }),
        (t.Index.prototype.toJSON = function () {
          const e = Object.keys(this.invertedIndex)
              .sort()
              .map(function (n) {
                return [n, this.invertedIndex[n]]
              }, this),
            r = Object.keys(this.fieldVectors).map(function (n) {
              return [n, this.fieldVectors[n].toJSON()]
            }, this)
          return {
            version: t.version,
            fields: this.fields,
            fieldVectors: r,
            invertedIndex: e,
            pipeline: this.pipeline.toJSON(),
          }
        }),
        (t.Index.load = (e) => {
          const r = {},
            n = {},
            i = e.fieldVectors,
            s = Object.create(null),
            o = e.invertedIndex,
            a = new t.TokenSet.Builder(),
            l = t.Pipeline.load(e.pipeline)
          e.version !== t.version &&
            t.utils.warn(
              "Version mismatch when loading serialised index. Current version of lunr '" +
                t.version +
                "' does not match serialized index '" +
                e.version +
                "'",
            )
          for (let u = 0; u < i.length; u++) {
            const d = i[u],
              m = d[0],
              y = d[1]
            n[m] = new t.Vector(y)
          }
          for (let u = 0; u < o.length; u++) {
            const d = o[u],
              b = d[0],
              g = d[1]
            a.insert(b), (s[b] = g)
          }
          return (
            a.finish(),
            (r.fields = e.fields),
            (r.fieldVectors = n),
            (r.invertedIndex = s),
            (r.tokenSet = a.root),
            (r.pipeline = l),
            new t.Index(r)
          )
        })
      ;(t.Builder = function () {
        ;(this._ref = 'id'),
          (this._fields = Object.create(null)),
          (this._documents = Object.create(null)),
          (this.invertedIndex = Object.create(null)),
          (this.fieldTermFrequencies = {}),
          (this.fieldLengths = {}),
          (this.tokenizer = t.tokenizer),
          (this.pipeline = new t.Pipeline()),
          (this.searchPipeline = new t.Pipeline()),
          (this.documentCount = 0),
          (this._b = 0.75),
          (this._k1 = 1.2),
          (this.termIndex = 0),
          (this.metadataWhitelist = [])
      }),
        (t.Builder.prototype.ref = function (e) {
          this._ref = e
        }),
        (t.Builder.prototype.field = function (e, r) {
          if (/\//.test(e)) throw new RangeError("Field '" + e + "' contains illegal character '/'")
          this._fields[e] = r || {}
        }),
        (t.Builder.prototype.b = function (e) {
          e < 0 ? (this._b = 0) : e > 1 ? (this._b = 1) : (this._b = e)
        }),
        (t.Builder.prototype.k1 = function (e) {
          this._k1 = e
        }),
        (t.Builder.prototype.add = function (e, r) {
          const n = e[this._ref],
            i = Object.keys(this._fields)
          ;(this._documents[n] = r || {}), (this.documentCount += 1)
          for (let s = 0; s < i.length; s++) {
            const o = i[s],
              a = this._fields[o].extractor,
              l = a ? a(e) : e[o],
              u = this.tokenizer(l, { fields: [o] }),
              d = this.pipeline.run(u),
              m = new t.FieldRef(n, o),
              y = Object.create(null)
            ;(this.fieldTermFrequencies[m] = y),
              (this.fieldLengths[m] = 0),
              (this.fieldLengths[m] += d.length)
            for (let b = 0; b < d.length; b++) {
              const g = d[b]
              if ((y[g] == null && (y[g] = 0), (y[g] += 1), this.invertedIndex[g] == null)) {
                const E = Object.create(null)
                ;(E._index = this.termIndex), (this.termIndex += 1)
                for (let f = 0; f < i.length; f++) E[i[f]] = Object.create(null)
                this.invertedIndex[g] = E
              }
              this.invertedIndex[g][o][n] == null &&
                (this.invertedIndex[g][o][n] = Object.create(null))
              for (let p = 0; p < this.metadataWhitelist.length; p++) {
                const w = this.metadataWhitelist[p],
                  S = g.metadata[w]
                this.invertedIndex[g][o][n][w] == null && (this.invertedIndex[g][o][n][w] = []),
                  this.invertedIndex[g][o][n][w].push(S)
              }
            }
          }
        }),
        (t.Builder.prototype.calculateAverageFieldLengths = function () {
          for (
            let e = Object.keys(this.fieldLengths), r = e.length, n = {}, i = {}, s = 0;
            s < r;
            s++
          ) {
            const o = t.FieldRef.fromString(e[s]),
              a = o.fieldName
            i[a] || (i[a] = 0), (i[a] += 1), n[a] || (n[a] = 0), (n[a] += this.fieldLengths[o])
          }
          for (let l = Object.keys(this._fields), s = 0; s < l.length; s++) {
            const u = l[s]
            n[u] = n[u] / i[u]
          }
          this.averageFieldLength = n
        }),
        (t.Builder.prototype.createFieldVectors = function () {
          for (
            let e = {},
              r = Object.keys(this.fieldTermFrequencies),
              n = r.length,
              i = Object.create(null),
              s = 0;
            s < n;
            s++
          ) {
            for (
              let o = t.FieldRef.fromString(r[s]),
                a = o.fieldName,
                l = this.fieldLengths[o],
                u = new t.Vector(),
                d = this.fieldTermFrequencies[o],
                m = Object.keys(d),
                y = m.length,
                b = this._fields[a].boost || 1,
                g = this._documents[o.docRef].boost || 1,
                E = 0;
              E < y;
              E++
            ) {
              let f = m[E],
                p = d[f],
                w = this.invertedIndex[f]._index,
                S,
                k,
                _
              i[f] === void 0
                ? ((S = t.idf(this.invertedIndex[f], this.documentCount)), (i[f] = S))
                : (S = i[f]),
                (k =
                  (S * ((this._k1 + 1) * p)) /
                  (this._k1 * (1 - this._b + this._b * (l / this.averageFieldLength[a])) + p)),
                (k *= b),
                (k *= g),
                (_ = Math.round(k * 1e3) / 1e3),
                u.insert(w, _)
            }
            e[o] = u
          }
          this.fieldVectors = e
        }),
        (t.Builder.prototype.createTokenSet = function () {
          this.tokenSet = t.TokenSet.fromArray(Object.keys(this.invertedIndex).sort())
        }),
        (t.Builder.prototype.build = function () {
          return (
            this.calculateAverageFieldLengths(),
            this.createFieldVectors(),
            this.createTokenSet(),
            new t.Index({
              invertedIndex: this.invertedIndex,
              fieldVectors: this.fieldVectors,
              tokenSet: this.tokenSet,
              fields: Object.keys(this._fields),
              pipeline: this.searchPipeline,
            })
          )
        }),
        (t.Builder.prototype.use = function (e) {
          const r = Array.prototype.slice.call(arguments, 1)
          r.unshift(this), e.apply(this, r)
        }),
        (t.MatchData = function (e, r, n) {
          for (let i = Object.create(null), s = Object.keys(n || {}), o = 0; o < s.length; o++) {
            const a = s[o]
            i[a] = n[a].slice()
          }
          ;(this.metadata = Object.create(null)),
            e !== void 0 && ((this.metadata[e] = Object.create(null)), (this.metadata[e][r] = i))
        }),
        (t.MatchData.prototype.combine = function (e) {
          for (let r = Object.keys(e.metadata), n = 0; n < r.length; n++) {
            const i = r[n],
              s = Object.keys(e.metadata[i])
            this.metadata[i] == null && (this.metadata[i] = Object.create(null))
            for (let o = 0; o < s.length; o++) {
              const a = s[o],
                l = Object.keys(e.metadata[i][a])
              this.metadata[i][a] == null && (this.metadata[i][a] = Object.create(null))
              for (let u = 0; u < l.length; u++) {
                const d = l[u]
                this.metadata[i][a][d] == null
                  ? (this.metadata[i][a][d] = e.metadata[i][a][d])
                  : (this.metadata[i][a][d] = this.metadata[i][a][d].concat(e.metadata[i][a][d]))
              }
            }
          }
        }),
        (t.MatchData.prototype.add = function (e, r, n) {
          if (!(e in this.metadata)) {
            ;(this.metadata[e] = Object.create(null)), (this.metadata[e][r] = n)
            return
          }
          if (!(r in this.metadata[e])) {
            this.metadata[e][r] = n
            return
          }
          for (let i = Object.keys(n), s = 0; s < i.length; s++) {
            const o = i[s]
            o in this.metadata[e][r]
              ? (this.metadata[e][r][o] = this.metadata[e][r][o].concat(n[o]))
              : (this.metadata[e][r][o] = n[o])
          }
        }),
        (t.Query = function (e) {
          ;(this.clauses = []), (this.allFields = e)
        }),
        (t.Query.wildcard = new String('*')),
        (t.Query.wildcard.NONE = 0),
        (t.Query.wildcard.LEADING = 1),
        (t.Query.wildcard.TRAILING = 2),
        (t.Query.presence = { OPTIONAL: 1, REQUIRED: 2, PROHIBITED: 3 }),
        (t.Query.prototype.clause = function (e) {
          return (
            'fields' in e || (e.fields = this.allFields),
            'boost' in e || (e.boost = 1),
            'usePipeline' in e || (e.usePipeline = !0),
            'wildcard' in e || (e.wildcard = t.Query.wildcard.NONE),
            e.wildcard & t.Query.wildcard.LEADING &&
              e.term.charAt(0) !== t.Query.wildcard &&
              (e.term = '*' + e.term),
            e.wildcard & t.Query.wildcard.TRAILING &&
              e.term.slice(-1) !== t.Query.wildcard &&
              (e.term = '' + e.term + '*'),
            'presence' in e || (e.presence = t.Query.presence.OPTIONAL),
            this.clauses.push(e),
            this
          )
        }),
        (t.Query.prototype.isNegated = function () {
          for (let e = 0; e < this.clauses.length; e++)
            if (this.clauses[e].presence !== t.Query.presence.PROHIBITED) return !1
          return !0
        }),
        (t.Query.prototype.term = function (e, r) {
          if (Array.isArray(e))
            return (
              e.forEach(function (i) {
                this.term(i, t.utils.clone(r))
              }, this),
              this
            )
          const n = r || {}
          return (n.term = e.toString()), this.clause(n), this
        }),
        (t.QueryParseError = function (e, r, n) {
          ;(this.name = 'QueryParseError'), (this.message = e), (this.start = r), (this.end = n)
        }),
        (t.QueryParseError.prototype = new Error()),
        (t.QueryLexer = function (e) {
          ;(this.lexemes = []),
            (this.str = e),
            (this.length = e.length),
            (this.pos = 0),
            (this.start = 0),
            (this.escapeCharPositions = [])
        }),
        (t.QueryLexer.prototype.run = function () {
          for (let e = t.QueryLexer.lexText; e; ) e = e(this)
        }),
        (t.QueryLexer.prototype.sliceString = function () {
          for (
            let e = [], r = this.start, n = this.pos, i = 0;
            i < this.escapeCharPositions.length;
            i++
          )
            (n = this.escapeCharPositions[i]), e.push(this.str.slice(r, n)), (r = n + 1)
          return (
            e.push(this.str.slice(r, this.pos)), (this.escapeCharPositions.length = 0), e.join('')
          )
        }),
        (t.QueryLexer.prototype.emit = function (e) {
          this.lexemes.push({ type: e, str: this.sliceString(), start: this.start, end: this.pos }),
            (this.start = this.pos)
        }),
        (t.QueryLexer.prototype.escapeCharacter = function () {
          this.escapeCharPositions.push(this.pos - 1), (this.pos += 1)
        }),
        (t.QueryLexer.prototype.next = function () {
          if (this.pos >= this.length) return t.QueryLexer.EOS
          const e = this.str.charAt(this.pos)
          return (this.pos += 1), e
        }),
        (t.QueryLexer.prototype.width = function () {
          return this.pos - this.start
        }),
        (t.QueryLexer.prototype.ignore = function () {
          this.start === this.pos && (this.pos += 1), (this.start = this.pos)
        }),
        (t.QueryLexer.prototype.backup = function () {
          this.pos -= 1
        }),
        (t.QueryLexer.prototype.acceptDigitRun = function () {
          let e, r
          do (e = this.next()), (r = e.charCodeAt(0))
          while (r > 47 && r < 58)
          e !== t.QueryLexer.EOS && this.backup()
        }),
        (t.QueryLexer.prototype.more = function () {
          return this.pos < this.length
        }),
        (t.QueryLexer.EOS = 'EOS'),
        (t.QueryLexer.FIELD = 'FIELD'),
        (t.QueryLexer.TERM = 'TERM'),
        (t.QueryLexer.EDIT_DISTANCE = 'EDIT_DISTANCE'),
        (t.QueryLexer.BOOST = 'BOOST'),
        (t.QueryLexer.PRESENCE = 'PRESENCE'),
        (t.QueryLexer.lexField = (e) => (
          e.backup(), e.emit(t.QueryLexer.FIELD), e.ignore(), t.QueryLexer.lexText
        )),
        (t.QueryLexer.lexTerm = (e) => {
          if ((e.width() > 1 && (e.backup(), e.emit(t.QueryLexer.TERM)), e.ignore(), e.more()))
            return t.QueryLexer.lexText
        }),
        (t.QueryLexer.lexEditDistance = (e) => (
          e.ignore(), e.acceptDigitRun(), e.emit(t.QueryLexer.EDIT_DISTANCE), t.QueryLexer.lexText
        )),
        (t.QueryLexer.lexBoost = (e) => (
          e.ignore(), e.acceptDigitRun(), e.emit(t.QueryLexer.BOOST), t.QueryLexer.lexText
        )),
        (t.QueryLexer.lexEOS = (e) => {
          e.width() > 0 && e.emit(t.QueryLexer.TERM)
        }),
        (t.QueryLexer.termSeparator = t.tokenizer.separator),
        (t.QueryLexer.lexText = (e) => {
          for (;;) {
            const r = e.next()
            if (r === t.QueryLexer.EOS) return t.QueryLexer.lexEOS
            if (r.charCodeAt(0) === 92) {
              e.escapeCharacter()
              continue
            }
            if (r === ':') return t.QueryLexer.lexField
            if (r === '~')
              return (
                e.backup(), e.width() > 0 && e.emit(t.QueryLexer.TERM), t.QueryLexer.lexEditDistance
              )
            if (r === '^')
              return e.backup(), e.width() > 0 && e.emit(t.QueryLexer.TERM), t.QueryLexer.lexBoost
            if ((r === '+' && e.width() === 1) || (r === '-' && e.width() === 1))
              return e.emit(t.QueryLexer.PRESENCE), t.QueryLexer.lexText
            if (r.match(t.QueryLexer.termSeparator)) return t.QueryLexer.lexTerm
          }
        }),
        (t.QueryParser = function (e, r) {
          ;(this.lexer = new t.QueryLexer(e)),
            (this.query = r),
            (this.currentClause = {}),
            (this.lexemeIdx = 0)
        }),
        (t.QueryParser.prototype.parse = function () {
          this.lexer.run(), (this.lexemes = this.lexer.lexemes)
          for (let e = t.QueryParser.parseClause; e; ) e = e(this)
          return this.query
        }),
        (t.QueryParser.prototype.peekLexeme = function () {
          return this.lexemes[this.lexemeIdx]
        }),
        (t.QueryParser.prototype.consumeLexeme = function () {
          const e = this.peekLexeme()
          return (this.lexemeIdx += 1), e
        }),
        (t.QueryParser.prototype.nextClause = function () {
          const e = this.currentClause
          this.query.clause(e), (this.currentClause = {})
        }),
        (t.QueryParser.parseClause = (e) => {
          const r = e.peekLexeme()
          if (r != null)
            switch (r.type) {
              case t.QueryLexer.PRESENCE:
                return t.QueryParser.parsePresence
              case t.QueryLexer.FIELD:
                return t.QueryParser.parseField
              case t.QueryLexer.TERM:
                return t.QueryParser.parseTerm
              default: {
                let n = 'expected either a field or a term, found ' + r.type
                throw (
                  (r.str.length >= 1 && (n += " with value '" + r.str + "'"),
                  new t.QueryParseError(n, r.start, r.end))
                )
              }
            }
        }),
        (t.QueryParser.parsePresence = (e) => {
          const r = e.consumeLexeme()
          if (r != null) {
            switch (r.str) {
              case '-':
                e.currentClause.presence = t.Query.presence.PROHIBITED
                break
              case '+':
                e.currentClause.presence = t.Query.presence.REQUIRED
                break
              default: {
                const n = "unrecognised presence operator'" + r.str + "'"
                throw new t.QueryParseError(n, r.start, r.end)
              }
            }
            const i = e.peekLexeme()
            if (i == null) {
              const n = 'expecting term or field, found nothing'
              throw new t.QueryParseError(n, r.start, r.end)
            }
            switch (i.type) {
              case t.QueryLexer.FIELD:
                return t.QueryParser.parseField
              case t.QueryLexer.TERM:
                return t.QueryParser.parseTerm
              default: {
                const n = "expecting term or field, found '" + i.type + "'"
                throw new t.QueryParseError(n, i.start, i.end)
              }
            }
          }
        }),
        (t.QueryParser.parseField = (e) => {
          const r = e.consumeLexeme()
          if (r != null) {
            if (e.query.allFields.indexOf(r.str) === -1) {
              const n = e.query.allFields.map((o) => "'" + o + "'").join(', '),
                i = "unrecognised field '" + r.str + "', possible fields: " + n
              throw new t.QueryParseError(i, r.start, r.end)
            }
            e.currentClause.fields = [r.str]
            const s = e.peekLexeme()
            if (s == null) {
              const i = 'expecting term, found nothing'
              throw new t.QueryParseError(i, r.start, r.end)
            }
            switch (s.type) {
              case t.QueryLexer.TERM:
                return t.QueryParser.parseTerm
              default: {
                const i = "expecting term, found '" + s.type + "'"
                throw new t.QueryParseError(i, s.start, s.end)
              }
            }
          }
        }),
        (t.QueryParser.parseTerm = (e) => {
          const r = e.consumeLexeme()
          if (r != null) {
            ;(e.currentClause.term = r.str.toLowerCase()),
              r.str.indexOf('*') !== -1 && (e.currentClause.usePipeline = !1)
            const n = e.peekLexeme()
            if (n == null) {
              e.nextClause()
              return
            }
            switch (n.type) {
              case t.QueryLexer.TERM:
                return e.nextClause(), t.QueryParser.parseTerm
              case t.QueryLexer.FIELD:
                return e.nextClause(), t.QueryParser.parseField
              case t.QueryLexer.EDIT_DISTANCE:
                return t.QueryParser.parseEditDistance
              case t.QueryLexer.BOOST:
                return t.QueryParser.parseBoost
              case t.QueryLexer.PRESENCE:
                return e.nextClause(), t.QueryParser.parsePresence
              default: {
                const i = "Unexpected lexeme type '" + n.type + "'"
                throw new t.QueryParseError(i, n.start, n.end)
              }
            }
          }
        }),
        (t.QueryParser.parseEditDistance = (e) => {
          const r = e.consumeLexeme()
          if (r != null) {
            const n = Number.parseInt(r.str, 10)
            if (Number.isNaN(n)) {
              const i = 'edit distance must be numeric'
              throw new t.QueryParseError(i, r.start, r.end)
            }
            e.currentClause.editDistance = n
            const s = e.peekLexeme()
            if (s == null) {
              e.nextClause()
              return
            }
            switch (s.type) {
              case t.QueryLexer.TERM:
                return e.nextClause(), t.QueryParser.parseTerm
              case t.QueryLexer.FIELD:
                return e.nextClause(), t.QueryParser.parseField
              case t.QueryLexer.EDIT_DISTANCE:
                return t.QueryParser.parseEditDistance
              case t.QueryLexer.BOOST:
                return t.QueryParser.parseBoost
              case t.QueryLexer.PRESENCE:
                return e.nextClause(), t.QueryParser.parsePresence
              default: {
                const i = "Unexpected lexeme type '" + s.type + "'"
                throw new t.QueryParseError(i, s.start, s.end)
              }
            }
          }
        }),
        (t.QueryParser.parseBoost = (e) => {
          const r = e.consumeLexeme()
          if (r != null) {
            const n = Number.parseInt(r.str, 10)
            if (Number.isNaN(n)) {
              const i = 'boost must be numeric'
              throw new t.QueryParseError(i, r.start, r.end)
            }
            e.currentClause.boost = n
            const s = e.peekLexeme()
            if (s == null) {
              e.nextClause()
              return
            }
            switch (s.type) {
              case t.QueryLexer.TERM:
                return e.nextClause(), t.QueryParser.parseTerm
              case t.QueryLexer.FIELD:
                return e.nextClause(), t.QueryParser.parseField
              case t.QueryLexer.EDIT_DISTANCE:
                return t.QueryParser.parseEditDistance
              case t.QueryLexer.BOOST:
                return t.QueryParser.parseBoost
              case t.QueryLexer.PRESENCE:
                return e.nextClause(), t.QueryParser.parsePresence
              default: {
                const i = "Unexpected lexeme type '" + s.type + "'"
                throw new t.QueryParseError(i, s.start, s.end)
              }
            }
          }
        }),
        ((e, r) => {
          typeof define === 'function' && define.amd
            ? define(r)
            : typeof se === 'object'
              ? (oe.exports = r())
              : (e.lunr = r())
        })(this, () => t)
    })()
  })
  const ne = []
  function G(t, e) {
    ne.push({ selector: e, constructor: t })
  }
  const U = class {
    constructor() {
      this.alwaysVisibleMember = null
      this.createComponents(document.body),
        this.ensureActivePageVisible(),
        this.ensureFocusedElementVisible(),
        this.listenForCodeCopies(),
        window.addEventListener('hashchange', () => this.ensureFocusedElementVisible())
    }
    createComponents(e) {
      ne.forEach((r) => {
        e.querySelectorAll(r.selector).forEach((n) => {
          n.dataset.hasInstance ||
            (new r.constructor({ el: n, app: this }), (n.dataset.hasInstance = String(!0)))
        })
      })
    }
    filterChanged() {
      this.ensureFocusedElementVisible()
    }
    ensureActivePageVisible() {
      let e = document.querySelector('.tsd-navigation .current'),
        r = e?.parentElement
      while (r && !r.classList.contains('.tsd-navigation'))
        r instanceof HTMLDetailsElement && (r.open = !0), (r = r.parentElement)
      if (e) {
        const n = e.getBoundingClientRect().top - document.documentElement.clientHeight / 4
        document.querySelector('.site-menu').scrollTop = n
      }
    }
    ensureFocusedElementVisible() {
      if (
        (this.alwaysVisibleMember &&
          (this.alwaysVisibleMember.classList.remove('always-visible'),
          this.alwaysVisibleMember.firstElementChild.remove(),
          (this.alwaysVisibleMember = null)),
        !location.hash)
      )
        return
      const e = document.getElementById(location.hash.substring(1))
      if (!e) return
      let r = e.parentElement
      while (r && r.tagName !== 'SECTION') r = r.parentElement
      if (r && r.offsetParent == null) {
        ;(this.alwaysVisibleMember = r), r.classList.add('always-visible')
        const n = document.createElement('p')
        n.classList.add('warning'),
          (n.textContent = 'This member is normally hidden due to your filter settings.'),
          r.prepend(n)
      }
    }
    listenForCodeCopies() {
      document.querySelectorAll('pre > button').forEach((e) => {
        let r
        e.addEventListener('click', () => {
          e.previousElementSibling instanceof HTMLElement &&
            navigator.clipboard.writeText(e.previousElementSibling.innerText.trim()),
            (e.textContent = 'Copied!'),
            e.classList.add('visible'),
            clearTimeout(r),
            (r = setTimeout(() => {
              e.classList.remove('visible'),
                (r = setTimeout(() => {
                  e.textContent = 'Copy'
                }, 100))
            }, 1e3))
        })
      })
    }
  }
  const ie = (t, e = 100) => {
    let r
    return () => {
      clearTimeout(r), (r = setTimeout(() => t(), e))
    }
  }
  const ce = Ce(ae())
  function de() {
    const t = document.getElementById('tsd-search')
    if (!t) return
    const e = document.getElementById('tsd-search-script')
    t.classList.add('loading'),
      e &&
        (e.addEventListener('error', () => {
          t.classList.remove('loading'), t.classList.add('failure')
        }),
        e.addEventListener('load', () => {
          t.classList.remove('loading'), t.classList.add('ready')
        }),
        window.searchData && t.classList.remove('loading'))
    const r = document.querySelector('#tsd-search input'),
      n = document.querySelector('#tsd-search .results')
    if (!r || !n) throw new Error('The input field or the result list wrapper was not found')
    let i = !1
    n.addEventListener('mousedown', () => (i = !0)),
      n.addEventListener('mouseup', () => {
        ;(i = !1), t.classList.remove('has-focus')
      }),
      r.addEventListener('focus', () => t.classList.add('has-focus')),
      r.addEventListener('blur', () => {
        i || ((i = !1), t.classList.remove('has-focus'))
      })
    const s = { base: t.dataset.base + '/' }
    Oe(t, n, r, s)
  }
  function Oe(t, e, r, n) {
    r.addEventListener(
      'input',
      ie(() => {
        Re(t, e, r, n)
      }, 200),
    )
    let i = !1
    r.addEventListener('keydown', (s) => {
      ;(i = !0),
        s.key === 'Enter'
          ? Fe(e, r)
          : s.key === 'Escape'
            ? r.blur()
            : s.key === 'ArrowUp'
              ? ue(e, -1)
              : s.key === 'ArrowDown'
                ? ue(e, 1)
                : (i = !1)
    }),
      r.addEventListener('keypress', (s) => {
        i && s.preventDefault()
      }),
      document.body.addEventListener('keydown', (s) => {
        s.altKey ||
          s.ctrlKey ||
          s.metaKey ||
          (!r.matches(':focus') && s.key === '/' && (r.focus(), s.preventDefault()))
      })
  }
  function _e(t, e) {
    t.index ||
      (window.searchData &&
        (e.classList.remove('loading'),
        e.classList.add('ready'),
        (t.data = window.searchData),
        (t.index = ce.Index.load(window.searchData.index))))
  }
  function Re(t, e, r, n) {
    if ((_e(n, t), !n.index || !n.data)) return
    e.textContent = ''
    const i = r.value.trim(),
      s = i ? n.index.search(`*${i}*`) : []
    for (let o = 0; o < s.length; o++) {
      let a = s[o],
        l = n.data.rows[Number(a.ref)],
        u = 1
      l.name.toLowerCase().startsWith(i.toLowerCase()) &&
        (u *= 1 + 1 / (1 + Math.abs(l.name.length - i.length))),
        (a.score *= u)
    }
    s.sort((o, a) => a.score - o.score)
    for (let o = 0, a = Math.min(10, s.length); o < a; o++) {
      let l = n.data.rows[Number(s[o].ref)],
        u = le(l.name, i)
      globalThis.DEBUG_SEARCH_WEIGHTS && (u += ` (score: ${s[o].score.toFixed(2)})`),
        l.parent && (u = `<span class="parent">${le(l.parent, i)}.</span>${u}`)
      const d = document.createElement('li')
      d.classList.value = l.classes ?? ''
      const m = document.createElement('a')
      ;(m.href = n.base + l.url), (m.innerHTML = u), d.append(m), e.appendChild(d)
    }
  }
  function ue(t, e) {
    let r = t.querySelector('.current')
    if (!r)
      (r = t.querySelector(e === 1 ? 'li:first-child' : 'li:last-child')),
        r && r.classList.add('current')
    else {
      let n = r
      if (e === 1)
        do n = n.nextElementSibling ?? void 0
        while (n instanceof HTMLElement && n.offsetParent == null)
      else
        do n = n.previousElementSibling ?? void 0
        while (n instanceof HTMLElement && n.offsetParent == null)
      n && (r.classList.remove('current'), n.classList.add('current'))
    }
  }
  function Fe(t, e) {
    let r = t.querySelector('.current')
    if ((r || (r = t.querySelector('li:first-child')), r)) {
      const n = r.querySelector('a')
      n && (window.location.href = n.href), e.blur()
    }
  }
  function le(t, e) {
    if (e === '') return t
    let r = t.toLocaleLowerCase(),
      n = e.toLocaleLowerCase(),
      i = [],
      s = 0,
      o = r.indexOf(n)
    while (o !== -1)
      i.push(K(t.substring(s, o)), `<b>${K(t.substring(o, o + n.length))}</b>`),
        (s = o + n.length),
        (o = r.indexOf(n, s))
    return i.push(K(t.substring(s))), i.join('')
  }
  const Me = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }
  function K(t) {
    return t.replace(/[&<>"'"]/g, (e) => Me[e])
  }
  const P = class {
    constructor(e) {
      ;(this.el = e.el), (this.app = e.app)
    }
  }
  let M = 'mousedown',
    fe = 'mousemove',
    N = 'mouseup',
    J = { x: 0, y: 0 },
    he = !1,
    ee = !1,
    De = !1,
    D = !1,
    pe = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  document.documentElement.classList.add(pe ? 'is-mobile' : 'not-mobile')
  pe &&
    'ontouchstart' in document.documentElement &&
    ((De = !0), (M = 'touchstart'), (fe = 'touchmove'), (N = 'touchend'))
  document.addEventListener(M, (t) => {
    ;(ee = !0), (D = !1)
    const e = M === 'touchstart' ? t.targetTouches[0] : t
    ;(J.y = e.pageY || 0), (J.x = e.pageX || 0)
  })
  document.addEventListener(fe, (t) => {
    if (ee && !D) {
      const e = M === 'touchstart' ? t.targetTouches[0] : t,
        r = J.x - (e.pageX || 0),
        n = J.y - (e.pageY || 0)
      D = Math.sqrt(r * r + n * n) > 10
    }
  })
  document.addEventListener(N, () => {
    ee = !1
  })
  document.addEventListener('click', (t) => {
    he && (t.preventDefault(), t.stopImmediatePropagation(), (he = !1))
  })
  const X = class extends P {
    constructor(r) {
      super(r)
      ;(this.className = this.el.dataset.toggle || ''),
        this.el.addEventListener(N, (n) => this.onPointerUp(n)),
        this.el.addEventListener('click', (n) => n.preventDefault()),
        document.addEventListener(M, (n) => this.onDocumentPointerDown(n)),
        document.addEventListener(N, (n) => this.onDocumentPointerUp(n))
    }
    setActive(r) {
      if (this.active === r) return
      ;(this.active = r),
        document.documentElement.classList.toggle('has-' + this.className, r),
        this.el.classList.toggle('active', r)
      const n = (this.active ? 'to-has-' : 'from-has-') + this.className
      document.documentElement.classList.add(n),
        setTimeout(() => document.documentElement.classList.remove(n), 500)
    }
    onPointerUp(r) {
      D || (this.setActive(!0), r.preventDefault())
    }
    onDocumentPointerDown(r) {
      if (this.active) {
        if (r.target.closest('.col-sidebar, .tsd-filter-group')) return
        this.setActive(!1)
      }
    }
    onDocumentPointerUp(r) {
      if (!D && this.active && r.target.closest('.col-sidebar')) {
        const n = r.target.closest('a')
        if (n) {
          let i = window.location.href
          i.indexOf('#') !== -1 && (i = i.substring(0, i.indexOf('#'))),
            n.href.substring(0, i.length) === i && setTimeout(() => this.setActive(!1), 250)
        }
      }
    }
  }
  let te
  try {
    te = localStorage
  } catch {
    te = {
      getItem() {
        return null
      },
      setItem() {},
    }
  }
  const Q = te
  const me = document.head.appendChild(document.createElement('style'))
  me.dataset.for = 'filters'
  const Y = class extends P {
    constructor(r) {
      super(r)
      ;(this.key = `filter-${this.el.name}`),
        (this.value = this.el.checked),
        this.el.addEventListener('change', () => {
          this.setLocalStorage(this.el.checked)
        }),
        this.setLocalStorage(this.fromLocalStorage()),
        (me.innerHTML += `html:not(.${this.key}) .tsd-is-${this.el.name} { display: none; }
`)
    }
    fromLocalStorage() {
      const r = Q.getItem(this.key)
      return r ? r === 'true' : this.el.checked
    }
    setLocalStorage(r) {
      Q.setItem(this.key, r.toString()), (this.value = r), this.handleValueChange()
    }
    handleValueChange() {
      ;(this.el.checked = this.value),
        document.documentElement.classList.toggle(this.key, this.value),
        this.app.filterChanged(),
        document.querySelectorAll('.tsd-index-section').forEach((r) => {
          r.style.display = 'block'
          const n = Array.from(r.querySelectorAll('.tsd-index-link')).every(
            (i) => i.offsetParent == null,
          )
          r.style.display = n ? 'none' : 'block'
        })
    }
  }
  const Z = class extends P {
    constructor(r) {
      super(r)
      ;(this.summary = this.el.querySelector('.tsd-accordion-summary')),
        (this.icon = this.summary.querySelector('svg')),
        (this.key = `tsd-accordion-${this.summary.dataset.key ?? this.summary.textContent.trim().replace(/\s+/g, '-').toLowerCase()}`)
      const n = Q.getItem(this.key)
      ;(this.el.open = n ? n === 'true' : this.el.open),
        this.el.addEventListener('toggle', () => this.update()),
        this.update()
    }
    update() {
      ;(this.icon.style.transform = `rotate(${this.el.open ? 0 : -90}deg)`),
        Q.setItem(this.key, this.el.open.toString())
    }
  }
  function ve(t) {
    const e = Q.getItem('tsd-theme') || 'os'
    ;(t.value = e),
      ye(e),
      t.addEventListener('change', () => {
        Q.setItem('tsd-theme', t.value), ye(t.value)
      })
  }
  function ye(t) {
    document.documentElement.dataset.theme = t
  }
  de()
  G(X, 'a[data-toggle]')
  G(Z, '.tsd-index-accordion')
  G(Y, '.tsd-filter-item input[type=checkbox]')
  const ge = document.getElementById('tsd-theme')
  ge && ve(ge)
  const Ae = new U()
  Object.defineProperty(window, 'app', { value: Ae })
  document.querySelectorAll('summary a').forEach((t) => {
    t.addEventListener('click', () => {
      location.assign(t.href)
    })
  })
})()
/*! Bundled license information:

lunr/lunr.js:
  (**
   * lunr - http://lunrjs.com - A bit like Solr, but much smaller and not as bright - 2.3.9
   * Copyright (C) 2020 Oliver Nightingale
   * @license MIT
   *)
  (*!
   * lunr.utils
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.Set
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.tokenizer
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.Pipeline
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.Vector
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.stemmer
   * Copyright (C) 2020 Oliver Nightingale
   * Includes code from - http://tartarus.org/~martin/PorterStemmer/js.txt
   *)
  (*!
   * lunr.stopWordFilter
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.trimmer
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.TokenSet
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.Index
   * Copyright (C) 2020 Oliver Nightingale
   *)
  (*!
   * lunr.Builder
   * Copyright (C) 2020 Oliver Nightingale
   *)
*/
