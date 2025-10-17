"use strict";(self.webpackChunk_flowgram_ai_demo_free_layout=self.webpackChunk_flowgram_ai_demo_free_layout||[]).push([["3235"],{84461:function(e,t,n){n.d(t,{G6:()=>c,KU:()=>u,Th:()=>d,Us:()=>h,jE:()=>l});var r=n(75271),i=n(63875),o=(0,r.createContext)(null),s=(0,r.createContext)(null),a=(0,r.createContext)(void 0);function l(){return(0,r.useContext)(o)}function c(){let e=(0,r.useContext)(a);if(!e)throw Error("useInjector should be used in EditorProvider");return e}function u({children:e}){let[t,n]=(0,r.useState)(null),l=(0,r.useRef)(null);return l.current||(l.current=(0,i.vH)()),r.createElement(o.Provider,{value:t},r.createElement(s.Provider,{value:n},r.createElement(a.Provider,{value:l.current},e)))}function d(e){let{plugins:t,defaultValue:n,root:o,options:a,domProps:l={},extensions:u,didMount:d,children:h}=e,[f,p]=(0,r.useState)(),m=(0,r.useRef)(null),x=(0,r.useRef)(null),v=(0,r.useRef)(null),g=(0,r.useContext)(s),y=c();return v.current=e,(0,r.useEffect)(()=>{let{render:e,eventKeys:r}=(0,i.Ue)({plugins:t,injector:y}),s=e({parent:m.current,root:o,defaultValue:n,options:a??{},extensions:u});return x.current=s,r.forEach(e=>{s.$on(e,t=>{var n;let r=null==(n=v.current)?void 0:n[`on${e.charAt(0).toUpperCase()+e.substring(1)}`];"function"==typeof r&&r(t)})}),"function"==typeof d&&d(s),p(s),()=>{s.$destroy()}},[]),(0,r.useEffect)(()=>{f&&g&&g(f)},[f,g]),(0,r.useEffect)(()=>{x.current.$set(e.options??{})},[e.options]),r.createElement(r.Fragment,null,r.createElement("div",{...l,ref:m}),h)}function h(e,t){return function(n){let i=n.extensions,o=(0,r.useMemo)(()=>[...t??[],...i??[]],[i]);return r.createElement(d,{...n,extensions:o,plugins:e})}}},26322:function(e,t,n){n.r(t),n.d(t,{VariableTagInject:()=>w});var r=n(52676),i=n(75271),o=n(90437),s=n(28579),a=n(92178),l=n(84461),c=n(30808),u=n(42397),d=n(15019),h=n(30967);let f=e=>({render(t){(0,h.render)(t,e)},unmount(){(0,h.unmountComponentAtNode)(e)}});var p=n(44189);let m=p.ZP.div`
  margin-right: 4px;
  min-width: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--semi-color-text-2);
`,x=p.ZP.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,v=(0,p.ZP)(c.Vp)`
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  max-width: 300px;

  & .semi-tag-content-center {
    justify-content: flex-start;
  }

  &.semi-tag {
    margin: 0 5px;
  }
`,g=p.ZP.div`
  padding: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
`;class y extends d.l9{constructor({keyPath:e,scope:t}){super(),this.toDispose=new a.K46,this.renderIcon=e=>"string"==typeof e?(0,r.jsx)("img",{style:{marginRight:8},width:12,height:12,src:e}):e,this.keyPath=e,this.scope=t}renderVariable(e){if(!e)return void this.root.render((0,r.jsx)(v,{prefixIcon:(0,r.jsx)(u.Z,{}),color:"amber",children:"Unknown"}));let t=(0,o.Z)(e.parentFields)||e,n=e===t,i=(0,r.jsx)(m,{children:t.meta?.title?`${t.meta.title} ${n?"":"-"} `:""}),s=this.renderIcon(t?.meta.icon);this.root.render((0,r.jsx)(c.J2,{content:(0,r.jsxs)(g,{children:[s,i,(0,r.jsx)(x,{children:e?.keyPath.slice(1).join(".")})]}),children:(0,r.jsxs)(v,{prefixIcon:s,children:[i,!n&&(0,r.jsx)(x,{children:e?.key})]})}))}toDOM(e){let t=document.createElement("span");return this.root=f(t),this.toDispose.push(a.JTr.create(()=>{this.root.unmount()})),this.toDispose.push(this.scope.available.trackByKeyPath(this.keyPath,e=>{this.renderVariable(e)},{triggerOnInit:!1})),this.renderVariable(this.scope.available.getByKeyPath(this.keyPath)),t}eq(e){return(0,s.Z)(this.keyPath,e.keyPath)}ignoreEvent(){return!1}destroy(e){this.toDispose.dispose()}}function w(){let e=(0,l.G6)(),t=(0,a.$eD)();return(0,i.useLayoutEffect)(()=>{let n=new d.Y1({regexp:/\{\{([^\}\{]+)\}\}/g,decoration:e=>d.p.replace({widget:new y({keyPath:e[1]?.split(".")??[],scope:t})})});return e.inject([d.lg.fromClass(class{constructor(e){this.view=e,this.decorations=n.createDeco(e)}update(){this.decorations=n.createDeco(this.view)}},{decorations:e=>e.decorations,provide:e=>d.tk.atomicRanges.of(t=>t.plugin(e)?.decorations??d.p.none)})])},[e]),null}}}]);