import{r as rn,a as o,R as z,b as ot,c as an,d as st}from"./react-vendor-CyE4uQHY.js";var me={exports:{}},Y={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var We;function on(){if(We)return Y;We=1;var e=rn(),t=Symbol.for("react.element"),n=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,s={key:!0,ref:!0,__self:!0,__source:!0};function l(c,f,u){var h,p={},m=null,g=null;u!==void 0&&(m=""+u),f.key!==void 0&&(m=""+f.key),f.ref!==void 0&&(g=f.ref);for(h in f)r.call(f,h)&&!s.hasOwnProperty(h)&&(p[h]=f[h]);if(c&&c.defaultProps)for(h in f=c.defaultProps,f)p[h]===void 0&&(p[h]=f[h]);return{$$typeof:t,type:c,key:m,ref:g,props:p,_owner:a.current}}return Y.Fragment=n,Y.jsx=l,Y.jsxs=l,Y}var Ue;function sn(){return Ue||(Ue=1,me.exports=on()),me.exports}var v=sn();function R(e,t,{checkForDefaultPrevented:n=!0}={}){return function(a){if(e?.(a),n===!1||!a.defaultPrevented)return t?.(a)}}function Be(e,t){if(typeof e=="function")return e(t);e!=null&&(e.current=t)}function ct(...e){return t=>{let n=!1;const r=e.map(a=>{const s=Be(a,t);return!n&&typeof s=="function"&&(n=!0),s});if(n)return()=>{for(let a=0;a<r.length;a++){const s=r[a];typeof s=="function"?s():Be(e[a],null)}}}}function O(...e){return o.useCallback(ct(...e),e)}function cn(e,t){const n=o.createContext(t),r=s=>{const{children:l,...c}=s,f=o.useMemo(()=>c,Object.values(c));return v.jsx(n.Provider,{value:f,children:l})};r.displayName=e+"Provider";function a(s){const l=o.useContext(n);if(l)return l;if(t!==void 0)return t;throw new Error(`\`${s}\` must be used within \`${e}\``)}return[r,a]}function Oe(e,t=[]){let n=[];function r(s,l){const c=o.createContext(l),f=n.length;n=[...n,l];const u=p=>{const{scope:m,children:g,...S}=p,d=m?.[e]?.[f]||c,y=o.useMemo(()=>S,Object.values(S));return v.jsx(d.Provider,{value:y,children:g})};u.displayName=s+"Provider";function h(p,m){const g=m?.[e]?.[f]||c,S=o.useContext(g);if(S)return S;if(l!==void 0)return l;throw new Error(`\`${p}\` must be used within \`${s}\``)}return[u,h]}const a=()=>{const s=n.map(l=>o.createContext(l));return function(c){const f=c?.[e]||s;return o.useMemo(()=>({[`__scope${e}`]:{...c,[e]:f}}),[c,f])}};return a.scopeName=e,[r,ln(a,...t)]}function ln(...e){const t=e[0];if(e.length===1)return t;const n=()=>{const r=e.map(a=>({useScope:a(),scopeName:a.scopeName}));return function(s){const l=r.reduce((c,{useScope:f,scopeName:u})=>{const p=f(s)[`__scope${u}`];return{...c,...p}},{});return o.useMemo(()=>({[`__scope${t.scopeName}`]:l}),[l])}};return n.scopeName=t.scopeName,n}function G(e){const t=un(e),n=o.forwardRef((r,a)=>{const{children:s,...l}=r,c=o.Children.toArray(s),f=c.find(dn);if(f){const u=f.props.children,h=c.map(p=>p===f?o.Children.count(u)>1?o.Children.only(null):o.isValidElement(u)?u.props.children:null:p);return v.jsx(t,{...l,ref:a,children:o.isValidElement(u)?o.cloneElement(u,void 0,h):null})}return v.jsx(t,{...l,ref:a,children:s})});return n.displayName=`${e}.Slot`,n}var sa=G("Slot");function un(e){const t=o.forwardRef((n,r)=>{const{children:a,...s}=n;if(o.isValidElement(a)){const l=hn(a),c=fn(s,a.props);return a.type!==o.Fragment&&(c.ref=r?ct(r,l):l),o.cloneElement(a,c)}return o.Children.count(a)>1?o.Children.only(null):null});return t.displayName=`${e}.SlotClone`,t}var it=Symbol("radix.slottable");function ca(e){const t=({children:n})=>v.jsx(v.Fragment,{children:n});return t.displayName=`${e}.Slottable`,t.__radixId=it,t}function dn(e){return o.isValidElement(e)&&typeof e.type=="function"&&"__radixId"in e.type&&e.type.__radixId===it}function fn(e,t){const n={...t};for(const r in t){const a=e[r],s=t[r];/^on[A-Z]/.test(r)?a&&s?n[r]=(...c)=>{const f=s(...c);return a(...c),f}:a&&(n[r]=a):r==="style"?n[r]={...a,...s}:r==="className"&&(n[r]=[a,s].filter(Boolean).join(" "))}return{...e,...n}}function hn(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}function yn(e){const t=e+"CollectionProvider",[n,r]=Oe(t),[a,s]=n(t,{collectionRef:{current:null},itemMap:new Map}),l=d=>{const{scope:y,children:w}=d,k=z.useRef(null),x=z.useRef(new Map).current;return v.jsx(a,{scope:y,itemMap:x,collectionRef:k,children:w})};l.displayName=t;const c=e+"CollectionSlot",f=G(c),u=z.forwardRef((d,y)=>{const{scope:w,children:k}=d,x=s(c,w),b=O(y,x.collectionRef);return v.jsx(f,{ref:b,children:k})});u.displayName=c;const h=e+"CollectionItemSlot",p="data-radix-collection-item",m=G(h),g=z.forwardRef((d,y)=>{const{scope:w,children:k,...x}=d,b=z.useRef(null),M=O(y,b),T=s(h,w);return z.useEffect(()=>(T.itemMap.set(b,{ref:b,...x}),()=>void T.itemMap.delete(b))),v.jsx(m,{[p]:"",ref:M,children:k})});g.displayName=h;function S(d){const y=s(e+"CollectionConsumer",d);return z.useCallback(()=>{const k=y.collectionRef.current;if(!k)return[];const x=Array.from(k.querySelectorAll(`[${p}]`));return Array.from(y.itemMap.values()).sort((T,E)=>x.indexOf(T.ref.current)-x.indexOf(E.ref.current))},[y.collectionRef,y.itemMap])}return[{Provider:l,Slot:u,ItemSlot:g},S,r]}var pn=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],P=pn.reduce((e,t)=>{const n=G(`Primitive.${t}`),r=o.forwardRef((a,s)=>{const{asChild:l,...c}=a,f=l?n:t;return typeof window<"u"&&(window[Symbol.for("radix-ui")]=!0),v.jsx(f,{...c,ref:s})});return r.displayName=`Primitive.${t}`,{...e,[t]:r}},{});function lt(e,t){e&&ot.flushSync(()=>e.dispatchEvent(t))}function _(e){const t=o.useRef(e);return o.useEffect(()=>{t.current=e}),o.useMemo(()=>(...n)=>t.current?.(...n),[])}function vn(e,t=globalThis?.document){const n=_(e);o.useEffect(()=>{const r=a=>{a.key==="Escape"&&n(a)};return t.addEventListener("keydown",r,{capture:!0}),()=>t.removeEventListener("keydown",r,{capture:!0})},[n,t])}var mn="DismissableLayer",Te="dismissableLayer.update",kn="dismissableLayer.pointerDownOutside",gn="dismissableLayer.focusOutside",$e,ut=o.createContext({layers:new Set,layersWithOutsidePointerEventsDisabled:new Set,branches:new Set}),Ne=o.forwardRef((e,t)=>{const{disableOutsidePointerEvents:n=!1,onEscapeKeyDown:r,onPointerDownOutside:a,onFocusOutside:s,onInteractOutside:l,onDismiss:c,...f}=e,u=o.useContext(ut),[h,p]=o.useState(null),m=h?.ownerDocument??globalThis?.document,[,g]=o.useState({}),S=O(t,E=>p(E)),d=Array.from(u.layers),[y]=[...u.layersWithOutsidePointerEventsDisabled].slice(-1),w=d.indexOf(y),k=h?d.indexOf(h):-1,x=u.layersWithOutsidePointerEventsDisabled.size>0,b=k>=w,M=wn(E=>{const A=E.target,D=[...u.branches].some(F=>F.contains(A));!b||D||(a?.(E),l?.(E),E.defaultPrevented||c?.())},m),T=bn(E=>{const A=E.target;[...u.branches].some(F=>F.contains(A))||(s?.(E),l?.(E),E.defaultPrevented||c?.())},m);return vn(E=>{k===u.layers.size-1&&(r?.(E),!E.defaultPrevented&&c&&(E.preventDefault(),c()))},m),o.useEffect(()=>{if(h)return n&&(u.layersWithOutsidePointerEventsDisabled.size===0&&($e=m.body.style.pointerEvents,m.body.style.pointerEvents="none"),u.layersWithOutsidePointerEventsDisabled.add(h)),u.layers.add(h),Ke(),()=>{n&&u.layersWithOutsidePointerEventsDisabled.size===1&&(m.body.style.pointerEvents=$e)}},[h,m,n,u]),o.useEffect(()=>()=>{h&&(u.layers.delete(h),u.layersWithOutsidePointerEventsDisabled.delete(h),Ke())},[h,u]),o.useEffect(()=>{const E=()=>g({});return document.addEventListener(Te,E),()=>document.removeEventListener(Te,E)},[]),v.jsx(P.div,{...f,ref:S,style:{pointerEvents:x?b?"auto":"none":void 0,...e.style},onFocusCapture:R(e.onFocusCapture,T.onFocusCapture),onBlurCapture:R(e.onBlurCapture,T.onBlurCapture),onPointerDownCapture:R(e.onPointerDownCapture,M.onPointerDownCapture)})});Ne.displayName=mn;var xn="DismissableLayerBranch",dt=o.forwardRef((e,t)=>{const n=o.useContext(ut),r=o.useRef(null),a=O(t,r);return o.useEffect(()=>{const s=r.current;if(s)return n.branches.add(s),()=>{n.branches.delete(s)}},[n.branches]),v.jsx(P.div,{...e,ref:a})});dt.displayName=xn;function wn(e,t=globalThis?.document){const n=_(e),r=o.useRef(!1),a=o.useRef(()=>{});return o.useEffect(()=>{const s=c=>{if(c.target&&!r.current){let f=function(){ft(kn,n,u,{discrete:!0})};const u={originalEvent:c};c.pointerType==="touch"?(t.removeEventListener("click",a.current),a.current=f,t.addEventListener("click",a.current,{once:!0})):f()}else t.removeEventListener("click",a.current);r.current=!1},l=window.setTimeout(()=>{t.addEventListener("pointerdown",s)},0);return()=>{window.clearTimeout(l),t.removeEventListener("pointerdown",s),t.removeEventListener("click",a.current)}},[t,n]),{onPointerDownCapture:()=>r.current=!0}}function bn(e,t=globalThis?.document){const n=_(e),r=o.useRef(!1);return o.useEffect(()=>{const a=s=>{s.target&&!r.current&&ft(gn,n,{originalEvent:s},{discrete:!1})};return t.addEventListener("focusin",a),()=>t.removeEventListener("focusin",a)},[t,n]),{onFocusCapture:()=>r.current=!0,onBlurCapture:()=>r.current=!1}}function Ke(){const e=new CustomEvent(Te);document.dispatchEvent(e)}function ft(e,t,n,{discrete:r}){const a=n.originalEvent.target,s=new CustomEvent(e,{bubbles:!1,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),r?lt(a,s):a.dispatchEvent(s)}var Mn=Ne,En=dt,K=globalThis?.document?o.useLayoutEffect:()=>{},Cn="Portal",Le=o.forwardRef((e,t)=>{const{container:n,...r}=e,[a,s]=o.useState(!1);K(()=>s(!0),[]);const l=n||a&&globalThis?.document?.body;return l?an.createPortal(v.jsx(P.div,{...r,ref:t}),l):null});Le.displayName=Cn;function Sn(e,t){return o.useReducer((n,r)=>t[n][r]??n,e)}var J=e=>{const{present:t,children:n}=e,r=Tn(t),a=typeof n=="function"?n({present:r.isPresent}):o.Children.only(n),s=O(r.ref,Rn(a));return typeof n=="function"||r.isPresent?o.cloneElement(a,{ref:s}):null};J.displayName="Presence";function Tn(e){const[t,n]=o.useState(),r=o.useRef(null),a=o.useRef(e),s=o.useRef("none"),l=e?"mounted":"unmounted",[c,f]=Sn(l,{mounted:{UNMOUNT:"unmounted",ANIMATION_OUT:"unmountSuspended"},unmountSuspended:{MOUNT:"mounted",ANIMATION_END:"unmounted"},unmounted:{MOUNT:"mounted"}});return o.useEffect(()=>{const u=re(r.current);s.current=c==="mounted"?u:"none"},[c]),K(()=>{const u=r.current,h=a.current;if(h!==e){const m=s.current,g=re(u);e?f("MOUNT"):g==="none"||u?.display==="none"?f("UNMOUNT"):f(h&&m!==g?"ANIMATION_OUT":"UNMOUNT"),a.current=e}},[e,f]),K(()=>{if(t){let u;const h=t.ownerDocument.defaultView??window,p=g=>{const d=re(r.current).includes(CSS.escape(g.animationName));if(g.target===t&&d&&(f("ANIMATION_END"),!a.current)){const y=t.style.animationFillMode;t.style.animationFillMode="forwards",u=h.setTimeout(()=>{t.style.animationFillMode==="forwards"&&(t.style.animationFillMode=y)})}},m=g=>{g.target===t&&(s.current=re(r.current))};return t.addEventListener("animationstart",m),t.addEventListener("animationcancel",p),t.addEventListener("animationend",p),()=>{h.clearTimeout(u),t.removeEventListener("animationstart",m),t.removeEventListener("animationcancel",p),t.removeEventListener("animationend",p)}}else f("ANIMATION_END")},[t,f]),{isPresent:["mounted","unmountSuspended"].includes(c),ref:o.useCallback(u=>{r.current=u?getComputedStyle(u):null,n(u)},[])}}function re(e){return e?.animationName||"none"}function Rn(e){let t=Object.getOwnPropertyDescriptor(e.props,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning;return n?e.ref:(t=Object.getOwnPropertyDescriptor(e,"ref")?.get,n=t&&"isReactWarning"in t&&t.isReactWarning,n?e.props.ref:e.props.ref||e.ref)}var Pn=st[" useInsertionEffect ".trim().toString()]||K;function ht({prop:e,defaultProp:t,onChange:n=()=>{},caller:r}){const[a,s,l]=An({defaultProp:t,onChange:n}),c=e!==void 0,f=c?e:a;{const h=o.useRef(e!==void 0);o.useEffect(()=>{const p=h.current;p!==c&&console.warn(`${r} is changing from ${p?"controlled":"uncontrolled"} to ${c?"controlled":"uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`),h.current=c},[c,r])}const u=o.useCallback(h=>{if(c){const p=Dn(h)?h(e):h;p!==e&&l.current?.(p)}else s(h)},[c,e,s,l]);return[f,u]}function An({defaultProp:e,onChange:t}){const[n,r]=o.useState(e),a=o.useRef(n),s=o.useRef(t);return Pn(()=>{s.current=t},[t]),o.useEffect(()=>{a.current!==n&&(s.current?.(n),a.current=n)},[n,a]),[n,r,s]}function Dn(e){return typeof e=="function"}var On=Object.freeze({position:"absolute",border:0,width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",wordWrap:"normal"}),Nn="VisuallyHidden",fe=o.forwardRef((e,t)=>v.jsx(P.span,{...e,ref:t,style:{...On,...e.style}}));fe.displayName=Nn;var ia=fe,Ie="ToastProvider",[_e,Ln,In]=yn("Toast"),[yt]=Oe("Toast",[In]),[_n,he]=yt(Ie),pt=e=>{const{__scopeToast:t,label:n="Notification",duration:r=5e3,swipeDirection:a="right",swipeThreshold:s=50,children:l}=e,[c,f]=o.useState(null),[u,h]=o.useState(0),p=o.useRef(!1),m=o.useRef(!1);return n.trim()||console.error(`Invalid prop \`label\` supplied to \`${Ie}\`. Expected non-empty \`string\`.`),v.jsx(_e.Provider,{scope:t,children:v.jsx(_n,{scope:t,label:n,duration:r,swipeDirection:a,swipeThreshold:s,toastCount:u,viewport:c,onViewportChange:f,onToastAdd:o.useCallback(()=>h(g=>g+1),[]),onToastRemove:o.useCallback(()=>h(g=>g-1),[]),isFocusedToastEscapeKeyDownRef:p,isClosePausedRef:m,children:l})})};pt.displayName=Ie;var vt="ToastViewport",Fn=["F8"],Re="toast.viewportPause",Pe="toast.viewportResume",mt=o.forwardRef((e,t)=>{const{__scopeToast:n,hotkey:r=Fn,label:a="Notifications ({hotkey})",...s}=e,l=he(vt,n),c=Ln(n),f=o.useRef(null),u=o.useRef(null),h=o.useRef(null),p=o.useRef(null),m=O(t,p,l.onViewportChange),g=r.join("+").replace(/Key/g,"").replace(/Digit/g,""),S=l.toastCount>0;o.useEffect(()=>{const y=w=>{r.length!==0&&r.every(x=>w[x]||w.code===x)&&p.current?.focus()};return document.addEventListener("keydown",y),()=>document.removeEventListener("keydown",y)},[r]),o.useEffect(()=>{const y=f.current,w=p.current;if(S&&y&&w){const k=()=>{if(!l.isClosePausedRef.current){const T=new CustomEvent(Re);w.dispatchEvent(T),l.isClosePausedRef.current=!0}},x=()=>{if(l.isClosePausedRef.current){const T=new CustomEvent(Pe);w.dispatchEvent(T),l.isClosePausedRef.current=!1}},b=T=>{!y.contains(T.relatedTarget)&&x()},M=()=>{y.contains(document.activeElement)||x()};return y.addEventListener("focusin",k),y.addEventListener("focusout",b),y.addEventListener("pointermove",k),y.addEventListener("pointerleave",M),window.addEventListener("blur",k),window.addEventListener("focus",x),()=>{y.removeEventListener("focusin",k),y.removeEventListener("focusout",b),y.removeEventListener("pointermove",k),y.removeEventListener("pointerleave",M),window.removeEventListener("blur",k),window.removeEventListener("focus",x)}}},[S,l.isClosePausedRef]);const d=o.useCallback(({tabbingDirection:y})=>{const k=c().map(x=>{const b=x.ref.current,M=[b,...Yn(b)];return y==="forwards"?M:M.reverse()});return(y==="forwards"?k.reverse():k).flat()},[c]);return o.useEffect(()=>{const y=p.current;if(y){const w=k=>{const x=k.altKey||k.ctrlKey||k.metaKey;if(k.key==="Tab"&&!x){const M=document.activeElement,T=k.shiftKey;if(k.target===y&&T){u.current?.focus();return}const D=d({tabbingDirection:T?"backwards":"forwards"}),F=D.findIndex(H=>H===M);ke(D.slice(F+1))?k.preventDefault():T?u.current?.focus():h.current?.focus()}};return y.addEventListener("keydown",w),()=>y.removeEventListener("keydown",w)}},[c,d]),v.jsxs(En,{ref:f,role:"region","aria-label":a.replace("{hotkey}",g),tabIndex:-1,style:{pointerEvents:S?void 0:"none"},children:[S&&v.jsx(Ae,{ref:u,onFocusFromOutsideViewport:()=>{const y=d({tabbingDirection:"forwards"});ke(y)}}),v.jsx(_e.Slot,{scope:n,children:v.jsx(P.ol,{tabIndex:-1,...s,ref:m})}),S&&v.jsx(Ae,{ref:h,onFocusFromOutsideViewport:()=>{const y=d({tabbingDirection:"backwards"});ke(y)}})]})});mt.displayName=vt;var kt="ToastFocusProxy",Ae=o.forwardRef((e,t)=>{const{__scopeToast:n,onFocusFromOutsideViewport:r,...a}=e,s=he(kt,n);return v.jsx(fe,{tabIndex:0,...a,ref:t,style:{position:"fixed"},onFocus:l=>{const c=l.relatedTarget;!s.viewport?.contains(c)&&r()}})});Ae.displayName=kt;var Q="Toast",jn="toast.swipeStart",Vn="toast.swipeMove",Hn="toast.swipeCancel",zn="toast.swipeEnd",gt=o.forwardRef((e,t)=>{const{forceMount:n,open:r,defaultOpen:a,onOpenChange:s,...l}=e,[c,f]=ht({prop:r,defaultProp:a??!0,onChange:s,caller:Q});return v.jsx(J,{present:n||c,children:v.jsx(Un,{open:c,...l,ref:t,onClose:()=>f(!1),onPause:_(e.onPause),onResume:_(e.onResume),onSwipeStart:R(e.onSwipeStart,u=>{u.currentTarget.setAttribute("data-swipe","start")}),onSwipeMove:R(e.onSwipeMove,u=>{const{x:h,y:p}=u.detail.delta;u.currentTarget.setAttribute("data-swipe","move"),u.currentTarget.style.setProperty("--radix-toast-swipe-move-x",`${h}px`),u.currentTarget.style.setProperty("--radix-toast-swipe-move-y",`${p}px`)}),onSwipeCancel:R(e.onSwipeCancel,u=>{u.currentTarget.setAttribute("data-swipe","cancel"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-x"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-y"),u.currentTarget.style.removeProperty("--radix-toast-swipe-end-x"),u.currentTarget.style.removeProperty("--radix-toast-swipe-end-y")}),onSwipeEnd:R(e.onSwipeEnd,u=>{const{x:h,y:p}=u.detail.delta;u.currentTarget.setAttribute("data-swipe","end"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-x"),u.currentTarget.style.removeProperty("--radix-toast-swipe-move-y"),u.currentTarget.style.setProperty("--radix-toast-swipe-end-x",`${h}px`),u.currentTarget.style.setProperty("--radix-toast-swipe-end-y",`${p}px`),f(!1)})})})});gt.displayName=Q;var[qn,Wn]=yt(Q,{onClose(){}}),Un=o.forwardRef((e,t)=>{const{__scopeToast:n,type:r="foreground",duration:a,open:s,onClose:l,onEscapeKeyDown:c,onPause:f,onResume:u,onSwipeStart:h,onSwipeMove:p,onSwipeCancel:m,onSwipeEnd:g,...S}=e,d=he(Q,n),[y,w]=o.useState(null),k=O(t,C=>w(C)),x=o.useRef(null),b=o.useRef(null),M=a||d.duration,T=o.useRef(0),E=o.useRef(M),A=o.useRef(0),{onToastAdd:D,onToastRemove:F}=d,H=_(()=>{y?.contains(document.activeElement)&&d.viewport?.focus(),l()}),ee=o.useCallback(C=>{!C||C===1/0||(window.clearTimeout(A.current),T.current=new Date().getTime(),A.current=window.setTimeout(H,C))},[H]);o.useEffect(()=>{const C=d.viewport;if(C){const I=()=>{ee(E.current),u?.()},j=()=>{const X=new Date().getTime()-T.current;E.current=E.current-X,window.clearTimeout(A.current),f?.()};return C.addEventListener(Re,j),C.addEventListener(Pe,I),()=>{C.removeEventListener(Re,j),C.removeEventListener(Pe,I)}}},[d.viewport,M,f,u,ee]),o.useEffect(()=>{s&&!d.isClosePausedRef.current&&ee(M)},[s,M,d.isClosePausedRef,ee]),o.useEffect(()=>(D(),()=>F()),[D,F]);const ze=o.useMemo(()=>y?St(y):null,[y]);return d.viewport?v.jsxs(v.Fragment,{children:[ze&&v.jsx(Bn,{__scopeToast:n,role:"status","aria-live":r==="foreground"?"assertive":"polite",children:ze}),v.jsx(qn,{scope:n,onClose:H,children:ot.createPortal(v.jsx(_e.ItemSlot,{scope:n,children:v.jsx(Mn,{asChild:!0,onEscapeKeyDown:R(c,()=>{d.isFocusedToastEscapeKeyDownRef.current||H(),d.isFocusedToastEscapeKeyDownRef.current=!1}),children:v.jsx(P.li,{tabIndex:0,"data-state":s?"open":"closed","data-swipe-direction":d.swipeDirection,...S,ref:k,style:{userSelect:"none",touchAction:"none",...e.style},onKeyDown:R(e.onKeyDown,C=>{C.key==="Escape"&&(c?.(C.nativeEvent),C.nativeEvent.defaultPrevented||(d.isFocusedToastEscapeKeyDownRef.current=!0,H()))}),onPointerDown:R(e.onPointerDown,C=>{C.button===0&&(x.current={x:C.clientX,y:C.clientY})}),onPointerMove:R(e.onPointerMove,C=>{if(!x.current)return;const I=C.clientX-x.current.x,j=C.clientY-x.current.y,X=!!b.current,Z=["left","right"].includes(d.swipeDirection),te=["left","up"].includes(d.swipeDirection)?Math.min:Math.max,tn=Z?te(0,I):0,nn=Z?0:te(0,j),ve=C.pointerType==="touch"?10:2,ne={x:tn,y:nn},qe={originalEvent:C,delta:ne};X?(b.current=ne,ae(Vn,p,qe,{discrete:!1})):Xe(ne,d.swipeDirection,ve)?(b.current=ne,ae(jn,h,qe,{discrete:!1}),C.target.setPointerCapture(C.pointerId)):(Math.abs(I)>ve||Math.abs(j)>ve)&&(x.current=null)}),onPointerUp:R(e.onPointerUp,C=>{const I=b.current,j=C.target;if(j.hasPointerCapture(C.pointerId)&&j.releasePointerCapture(C.pointerId),b.current=null,x.current=null,I){const X=C.currentTarget,Z={originalEvent:C,delta:I};Xe(I,d.swipeDirection,d.swipeThreshold)?ae(zn,g,Z,{discrete:!0}):ae(Hn,m,Z,{discrete:!0}),X.addEventListener("click",te=>te.preventDefault(),{once:!0})}})})})}),d.viewport)})]}):null}),Bn=e=>{const{__scopeToast:t,children:n,...r}=e,a=he(Q,t),[s,l]=o.useState(!1),[c,f]=o.useState(!1);return Xn(()=>l(!0)),o.useEffect(()=>{const u=window.setTimeout(()=>f(!0),1e3);return()=>window.clearTimeout(u)},[]),c?null:v.jsx(Le,{asChild:!0,children:v.jsx(fe,{...r,children:s&&v.jsxs(v.Fragment,{children:[a.label," ",n]})})})},$n="ToastTitle",xt=o.forwardRef((e,t)=>{const{__scopeToast:n,...r}=e;return v.jsx(P.div,{...r,ref:t})});xt.displayName=$n;var Kn="ToastDescription",wt=o.forwardRef((e,t)=>{const{__scopeToast:n,...r}=e;return v.jsx(P.div,{...r,ref:t})});wt.displayName=Kn;var bt="ToastAction",Mt=o.forwardRef((e,t)=>{const{altText:n,...r}=e;return n.trim()?v.jsx(Ct,{altText:n,asChild:!0,children:v.jsx(Fe,{...r,ref:t})}):(console.error(`Invalid prop \`altText\` supplied to \`${bt}\`. Expected non-empty \`string\`.`),null)});Mt.displayName=bt;var Et="ToastClose",Fe=o.forwardRef((e,t)=>{const{__scopeToast:n,...r}=e,a=Wn(Et,n);return v.jsx(Ct,{asChild:!0,children:v.jsx(P.button,{type:"button",...r,ref:t,onClick:R(e.onClick,a.onClose)})})});Fe.displayName=Et;var Ct=o.forwardRef((e,t)=>{const{__scopeToast:n,altText:r,...a}=e;return v.jsx(P.div,{"data-radix-toast-announce-exclude":"","data-radix-toast-announce-alt":r||void 0,...a,ref:t})});function St(e){const t=[];return Array.from(e.childNodes).forEach(r=>{if(r.nodeType===r.TEXT_NODE&&r.textContent&&t.push(r.textContent),Zn(r)){const a=r.ariaHidden||r.hidden||r.style.display==="none",s=r.dataset.radixToastAnnounceExclude==="";if(!a)if(s){const l=r.dataset.radixToastAnnounceAlt;l&&t.push(l)}else t.push(...St(r))}}),t}function ae(e,t,n,{discrete:r}){const a=n.originalEvent.currentTarget,s=new CustomEvent(e,{bubbles:!0,cancelable:!0,detail:n});t&&a.addEventListener(e,t,{once:!0}),r?lt(a,s):a.dispatchEvent(s)}var Xe=(e,t,n=0)=>{const r=Math.abs(e.x),a=Math.abs(e.y),s=r>a;return t==="left"||t==="right"?s&&r>n:!s&&a>n};function Xn(e=()=>{}){const t=_(e);K(()=>{let n=0,r=0;return n=window.requestAnimationFrame(()=>r=window.requestAnimationFrame(t)),()=>{window.cancelAnimationFrame(n),window.cancelAnimationFrame(r)}},[t])}function Zn(e){return e.nodeType===e.ELEMENT_NODE}function Yn(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:r=>{const a=r.tagName==="INPUT"&&r.type==="hidden";return r.disabled||r.hidden||a?NodeFilter.FILTER_SKIP:r.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function ke(e){const t=document.activeElement;return e.some(n=>n===t?!0:(n.focus(),document.activeElement!==t))}var la=pt,ua=mt,da=gt,fa=xt,ha=wt,ya=Mt,pa=Fe;/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gn=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Tt=(...e)=>e.filter((t,n,r)=>!!t&&r.indexOf(t)===n).join(" ");/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Jn={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qn=o.forwardRef(({color:e="currentColor",size:t=24,strokeWidth:n=2,absoluteStrokeWidth:r,className:a="",children:s,iconNode:l,...c},f)=>o.createElement("svg",{ref:f,...Jn,width:t,height:t,stroke:e,strokeWidth:r?Number(n)*24/Number(t):n,className:Tt("lucide",a),...c},[...l.map(([u,h])=>o.createElement(u,h)),...Array.isArray(s)?s:[s]]));/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=(e,t)=>{const n=o.forwardRef(({className:r,...a},s)=>o.createElement(Qn,{ref:s,iconNode:t,className:Tt(`lucide-${Gn(e)}`,r),...a}));return n.displayName=`${e}`,n};/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const va=i("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ma=i("AlarmClock",[["circle",{cx:"12",cy:"13",r:"8",key:"3y4lt7"}],["path",{d:"M12 9v4l2 2",key:"1c63tq"}],["path",{d:"M5 3 2 6",key:"18tl5t"}],["path",{d:"m22 6-3-3",key:"1opdir"}],["path",{d:"M6.38 18.7 4 21",key:"17xu3x"}],["path",{d:"M17.64 18.67 20 21",key:"kv2oe2"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ka=i("AlignCenter",[["path",{d:"M17 12H7",key:"16if0g"}],["path",{d:"M19 18H5",key:"18s9l3"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ga=i("AlignJustify",[["path",{d:"M3 12h18",key:"1i2n21"}],["path",{d:"M3 18h18",key:"1h113x"}],["path",{d:"M3 6h18",key:"d0wm0j"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xa=i("AlignLeft",[["path",{d:"M15 12H3",key:"6jk70r"}],["path",{d:"M17 18H3",key:"1amg6g"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=i("AlignRight",[["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M21 18H7",key:"1ygte8"}],["path",{d:"M21 6H3",key:"1jwq7v"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=i("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ma=i("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ea=i("Bell",[["path",{d:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",key:"1qo2s2"}],["path",{d:"M10.3 21a1.94 1.94 0 0 0 3.4 0",key:"qgo35s"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=i("Bold",[["path",{d:"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",key:"mg9rjx"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sa=i("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ta=i("Building2",[["path",{d:"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z",key:"1b4qmf"}],["path",{d:"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2",key:"i71pzd"}],["path",{d:"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2",key:"10jefs"}],["path",{d:"M10 6h4",key:"1itunk"}],["path",{d:"M10 10h4",key:"tcdvrf"}],["path",{d:"M10 14h4",key:"kelpxr"}],["path",{d:"M10 18h4",key:"1ulq68"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ra=i("Calculator",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pa=i("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Aa=i("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Da=i("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oa=i("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Na=i("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const La=i("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ia=i("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _a=i("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fa=i("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ja=i("CircleCheckBig",[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Va=i("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ha=i("CircleUser",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}],["path",{d:"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662",key:"154egf"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const za=i("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qa=i("Circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wa=i("Clock3",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16.5 12",key:"1aq6pp"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ua=i("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ba=i("CodeXml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $a=i("Code",[["polyline",{points:"16 18 22 12 16 6",key:"z7tu5w"}],["polyline",{points:"8 6 2 12 8 18",key:"1eg1df"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ka=i("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xa=i("DatabaseZap",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 15 21.84",key:"14ibmq"}],["path",{d:"M21 5V8",key:"1marbg"}],["path",{d:"M21 12L18 17H22L19 22",key:"zafso"}],["path",{d:"M3 12A9 3 0 0 0 14.59 14.87",key:"1y4wr8"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Za=i("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ya=i("DollarSign",[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ga=i("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ja=i("EllipsisVertical",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qa=i("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=i("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=i("FileArchive",[["path",{d:"M10 12v-1",key:"v7bkov"}],["path",{d:"M10 18v-2",key:"1cjy8d"}],["path",{d:"M10 7V6",key:"dljcrl"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M15.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 .274 1.01",key:"gkbcor"}],["circle",{cx:"10",cy:"20",r:"2",key:"1xzdoj"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=i("FileCheck",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"m9 15 2 2 4-4",key:"1grp1n"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=i("FileCode",[["path",{d:"M10 12.5 8 15l2 2.5",key:"1tg20x"}],["path",{d:"m14 12.5 2 2.5-2 2.5",key:"yinavb"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z",key:"1mlx9k"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=i("FileDown",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M12 18v-6",key:"17g6i2"}],["path",{d:"m9 15 3 3 3-3",key:"1npd3o"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=i("FileKey",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["circle",{cx:"10",cy:"16",r:"2",key:"4ckbqe"}],["path",{d:"m16 10-4.5 4.5",key:"7p3ebg"}],["path",{d:"m15 11 1 1",key:"1bsyx3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=i("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=i("FileStack",[["path",{d:"M21 7h-3a2 2 0 0 1-2-2V2",key:"9rb54x"}],["path",{d:"M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z",key:"1059l0"}],["path",{d:"M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15",key:"16874u"}],["path",{d:"M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11",key:"k2ox98"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=i("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=i("File",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=i("Filter",[["polygon",{points:"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3",key:"1yg77f"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=i("GitBranch",[["line",{x1:"6",x2:"6",y1:"3",y2:"15",key:"17qcm7"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M18 9a9 9 0 0 1-9 9",key:"n2h4wq"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=i("GripVertical",[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=i("HardDrive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=i("Heading1",[["path",{d:"M4 12h8",key:"17cfdx"}],["path",{d:"M4 18V6",key:"1rz3zl"}],["path",{d:"M12 18V6",key:"zqpxq5"}],["path",{d:"m17 12 3-2v8",key:"1hhhft"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=i("Heading2",[["path",{d:"M4 12h8",key:"17cfdx"}],["path",{d:"M4 18V6",key:"1rz3zl"}],["path",{d:"M12 18V6",key:"zqpxq5"}],["path",{d:"M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1",key:"9jr5yi"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=i("Heading3",[["path",{d:"M4 12h8",key:"17cfdx"}],["path",{d:"M4 18V6",key:"1rz3zl"}],["path",{d:"M12 18V6",key:"zqpxq5"}],["path",{d:"M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2",key:"68ncm8"}],["path",{d:"M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2",key:"1ejuhz"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=i("Highlighter",[["path",{d:"m9 11-6 6v3h9l3-3",key:"1a3l36"}],["path",{d:"m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4",key:"14a9rk"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=i("History",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M12 7v5l4 2",key:"1fdv2h"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=i("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=i("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=i("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=i("Italic",[["line",{x1:"19",x2:"10",y1:"4",y2:"4",key:"15jd3p"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20",key:"bu0au3"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20",key:"uljnxc"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=i("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=i("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=i("LayoutList",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}],["path",{d:"M14 4h7",key:"3xa0d5"}],["path",{d:"M14 9h7",key:"1icrd9"}],["path",{d:"M14 15h7",key:"1mj8o2"}],["path",{d:"M14 20h7",key:"11slyb"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=i("Link2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=i("Link",[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",key:"1cjeqo"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",key:"19qd67"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=i("ListChecks",[["path",{d:"m3 17 2 2 4-4",key:"1jhpwq"}],["path",{d:"m3 7 2 2 4-4",key:"1obspn"}],["path",{d:"M13 6h8",key:"15sg57"}],["path",{d:"M13 12h8",key:"h98zly"}],["path",{d:"M13 18h8",key:"oe0vm4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=i("ListOrdered",[["path",{d:"M10 12h11",key:"6m4ad9"}],["path",{d:"M10 18h11",key:"11hvi2"}],["path",{d:"M10 6h11",key:"c7qv1k"}],["path",{d:"M4 10h2",key:"16xx2s"}],["path",{d:"M4 6h1v4",key:"cnovpq"}],["path",{d:"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1",key:"m9a95d"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=i("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=i("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=i("Loader",[["path",{d:"M12 2v4",key:"3427ic"}],["path",{d:"m16.2 7.8 2.9-2.9",key:"r700ao"}],["path",{d:"M18 12h4",key:"wj9ykh"}],["path",{d:"m16.2 16.2 2.9 2.9",key:"1bxg5t"}],["path",{d:"M12 18v4",key:"jadmvz"}],["path",{d:"m4.9 19.1 2.9-2.9",key:"bwix9q"}],["path",{d:"M2 12h4",key:"j09sii"}],["path",{d:"m4.9 4.9 2.9 2.9",key:"giyufr"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=i("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=i("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=i("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=i("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=i("Maximize",[["path",{d:"M8 3H5a2 2 0 0 0-2 2v3",key:"1dcmit"}],["path",{d:"M21 8V5a2 2 0 0 0-2-2h-3",key:"1e4gt3"}],["path",{d:"M3 16v3a2 2 0 0 0 2 2h3",key:"wsl5sc"}],["path",{d:"M16 21h3a2 2 0 0 0 2-2v-3",key:"18trek"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=i("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=i("Minimize",[["path",{d:"M8 3v3a2 2 0 0 1-2 2H3",key:"hohbtr"}],["path",{d:"M21 8h-3a2 2 0 0 1-2-2V3",key:"5jw1f3"}],["path",{d:"M3 16h3a2 2 0 0 1 2 2v3",key:"198tvr"}],["path",{d:"M16 21v-3a2 2 0 0 1 2-2h3",key:"ph8mxp"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=i("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=i("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=i("Music",[["path",{d:"M9 18V5l12-2v13",key:"1jmyc2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["circle",{cx:"18",cy:"16",r:"3",key:"1hluhg"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=i("Package",[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["path",{d:"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7",key:"yx3hmr"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=i("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=i("PanelLeft",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M9 3v18",key:"fh3hqa"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=i("Paperclip",[["path",{d:"m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48",key:"1u3ebp"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=i("Pause",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=i("Pen",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=i("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=i("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=i("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=i("Quote",[["path",{d:"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"rib7q0"}],["path",{d:"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"1ymkrd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const es=i("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ts=i("Redo",[["path",{d:"M21 7v6h-6",key:"3ptur4"}],["path",{d:"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7",key:"1kgawr"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ns=i("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rs=i("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const as=i("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const os=i("Scale",[["path",{d:"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"7g6ntu"}],["path",{d:"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",key:"ijws7r"}],["path",{d:"M7 21h10",key:"1b0cd5"}],["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",key:"3gwbw2"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ss=i("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cs=i("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const is=i("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ls=i("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const us=i("Sparkles",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ds=i("SquareCheckBig",[["path",{d:"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5",key:"1uzm8b"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fs=i("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hs=i("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ys=i("Star",[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",key:"8f66p6"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ps=i("Strikethrough",[["path",{d:"M16 4H9a3 3 0 0 0-2.83 4",key:"43sutm"}],["path",{d:"M14 12a4 4 0 0 1 0 8H6",key:"nlfj13"}],["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vs=i("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ms=i("Table",[["path",{d:"M12 3v18",key:"108xh3"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M3 9h18",key:"1pudct"}],["path",{d:"M3 15h18",key:"5xshup"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ks=i("Target",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gs=i("Timer",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xs=i("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ws=i("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bs=i("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ms=i("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Es=i("Underline",[["path",{d:"M6 4v6a6 6 0 0 0 12 0V4",key:"9kb039"}],["line",{x1:"4",x2:"20",y1:"20",y2:"20",key:"nun2al"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cs=i("Undo",[["path",{d:"M3 7v6h6",key:"1v2h90"}],["path",{d:"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",key:"1r6uu6"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ss=i("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ts=i("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rs=i("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ps=i("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const As=i("Variable",[["path",{d:"M8 21s-4-3-4-9 4-9 4-9",key:"uto9ud"}],["path",{d:"M16 3s4 3 4 9-4 9-4 9",key:"4w2vsq"}],["line",{x1:"15",x2:"9",y1:"9",y2:"15",key:"f7djnv"}],["line",{x1:"9",x2:"15",y1:"9",y2:"15",key:"1shsy8"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ds=i("Video",[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Os=i("WifiOff",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}],["path",{d:"M5 12.859a10 10 0 0 1 5.17-2.69",key:"1dl1wf"}],["path",{d:"M19 12.859a10 10 0 0 0-2.007-1.523",key:"4k23kn"}],["path",{d:"M2 8.82a15 15 0 0 1 4.177-2.643",key:"1grhjp"}],["path",{d:"M22 8.82a15 15 0 0 0-11.288-3.764",key:"z3jwby"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ns=i("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ls=i("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);var er=st[" useId ".trim().toString()]||(()=>{}),tr=0;function ge(e){const[t,n]=o.useState(er());return K(()=>{n(r=>r??String(tr++))},[e]),t?`radix-${t}`:""}var xe="focusScope.autoFocusOnMount",we="focusScope.autoFocusOnUnmount",Ze={bubbles:!1,cancelable:!0},nr="FocusScope",Rt=o.forwardRef((e,t)=>{const{loop:n=!1,trapped:r=!1,onMountAutoFocus:a,onUnmountAutoFocus:s,...l}=e,[c,f]=o.useState(null),u=_(a),h=_(s),p=o.useRef(null),m=O(t,d=>f(d)),g=o.useRef({paused:!1,pause(){this.paused=!0},resume(){this.paused=!1}}).current;o.useEffect(()=>{if(r){let d=function(x){if(g.paused||!c)return;const b=x.target;c.contains(b)?p.current=b:V(p.current,{select:!0})},y=function(x){if(g.paused||!c)return;const b=x.relatedTarget;b!==null&&(c.contains(b)||V(p.current,{select:!0}))},w=function(x){if(document.activeElement===document.body)for(const M of x)M.removedNodes.length>0&&V(c)};document.addEventListener("focusin",d),document.addEventListener("focusout",y);const k=new MutationObserver(w);return c&&k.observe(c,{childList:!0,subtree:!0}),()=>{document.removeEventListener("focusin",d),document.removeEventListener("focusout",y),k.disconnect()}}},[r,c,g.paused]),o.useEffect(()=>{if(c){Ge.add(g);const d=document.activeElement;if(!c.contains(d)){const w=new CustomEvent(xe,Ze);c.addEventListener(xe,u),c.dispatchEvent(w),w.defaultPrevented||(rr(ir(Pt(c)),{select:!0}),document.activeElement===d&&V(c))}return()=>{c.removeEventListener(xe,u),setTimeout(()=>{const w=new CustomEvent(we,Ze);c.addEventListener(we,h),c.dispatchEvent(w),w.defaultPrevented||V(d??document.body,{select:!0}),c.removeEventListener(we,h),Ge.remove(g)},0)}}},[c,u,h,g]);const S=o.useCallback(d=>{if(!n&&!r||g.paused)return;const y=d.key==="Tab"&&!d.altKey&&!d.ctrlKey&&!d.metaKey,w=document.activeElement;if(y&&w){const k=d.currentTarget,[x,b]=ar(k);x&&b?!d.shiftKey&&w===b?(d.preventDefault(),n&&V(x,{select:!0})):d.shiftKey&&w===x&&(d.preventDefault(),n&&V(b,{select:!0})):w===k&&d.preventDefault()}},[n,r,g.paused]);return v.jsx(P.div,{tabIndex:-1,...l,ref:m,onKeyDown:S})});Rt.displayName=nr;function rr(e,{select:t=!1}={}){const n=document.activeElement;for(const r of e)if(V(r,{select:t}),document.activeElement!==n)return}function ar(e){const t=Pt(e),n=Ye(t,e),r=Ye(t.reverse(),e);return[n,r]}function Pt(e){const t=[],n=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:r=>{const a=r.tagName==="INPUT"&&r.type==="hidden";return r.disabled||r.hidden||a?NodeFilter.FILTER_SKIP:r.tabIndex>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});for(;n.nextNode();)t.push(n.currentNode);return t}function Ye(e,t){for(const n of e)if(!or(n,{upTo:t}))return n}function or(e,{upTo:t}){if(getComputedStyle(e).visibility==="hidden")return!0;for(;e;){if(t!==void 0&&e===t)return!1;if(getComputedStyle(e).display==="none")return!0;e=e.parentElement}return!1}function sr(e){return e instanceof HTMLInputElement&&"select"in e}function V(e,{select:t=!1}={}){if(e&&e.focus){const n=document.activeElement;e.focus({preventScroll:!0}),e!==n&&sr(e)&&t&&e.select()}}var Ge=cr();function cr(){let e=[];return{add(t){const n=e[0];t!==n&&n?.pause(),e=Je(e,t),e.unshift(t)},remove(t){e=Je(e,t),e[0]?.resume()}}}function Je(e,t){const n=[...e],r=n.indexOf(t);return r!==-1&&n.splice(r,1),n}function ir(e){return e.filter(t=>t.tagName!=="A")}var be=0;function lr(){o.useEffect(()=>{const e=document.querySelectorAll("[data-radix-focus-guard]");return document.body.insertAdjacentElement("afterbegin",e[0]??Qe()),document.body.insertAdjacentElement("beforeend",e[1]??Qe()),be++,()=>{be===1&&document.querySelectorAll("[data-radix-focus-guard]").forEach(t=>t.remove()),be--}},[])}function Qe(){const e=document.createElement("span");return e.setAttribute("data-radix-focus-guard",""),e.tabIndex=0,e.style.outline="none",e.style.opacity="0",e.style.position="fixed",e.style.pointerEvents="none",e}var L=function(){return L=Object.assign||function(t){for(var n,r=1,a=arguments.length;r<a;r++){n=arguments[r];for(var s in n)Object.prototype.hasOwnProperty.call(n,s)&&(t[s]=n[s])}return t},L.apply(this,arguments)};function At(e,t){var n={};for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&t.indexOf(r)<0&&(n[r]=e[r]);if(e!=null&&typeof Object.getOwnPropertySymbols=="function")for(var a=0,r=Object.getOwnPropertySymbols(e);a<r.length;a++)t.indexOf(r[a])<0&&Object.prototype.propertyIsEnumerable.call(e,r[a])&&(n[r[a]]=e[r[a]]);return n}function ur(e,t,n){if(n||arguments.length===2)for(var r=0,a=t.length,s;r<a;r++)(s||!(r in t))&&(s||(s=Array.prototype.slice.call(t,0,r)),s[r]=t[r]);return e.concat(s||Array.prototype.slice.call(t))}var le="right-scroll-bar-position",ue="width-before-scroll-bar",dr="with-scroll-bars-hidden",fr="--removed-body-scroll-bar-size";function Me(e,t){return typeof e=="function"?e(t):e&&(e.current=t),e}function hr(e,t){var n=o.useState(function(){return{value:e,callback:t,facade:{get current(){return n.value},set current(r){var a=n.value;a!==r&&(n.value=r,n.callback(r,a))}}}})[0];return n.callback=t,n.facade}var yr=typeof window<"u"?o.useLayoutEffect:o.useEffect,et=new WeakMap;function pr(e,t){var n=hr(null,function(r){return e.forEach(function(a){return Me(a,r)})});return yr(function(){var r=et.get(n);if(r){var a=new Set(r),s=new Set(e),l=n.current;a.forEach(function(c){s.has(c)||Me(c,null)}),s.forEach(function(c){a.has(c)||Me(c,l)})}et.set(n,e)},[e]),n}function vr(e){return e}function mr(e,t){t===void 0&&(t=vr);var n=[],r=!1,a={read:function(){if(r)throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");return n.length?n[n.length-1]:e},useMedium:function(s){var l=t(s,r);return n.push(l),function(){n=n.filter(function(c){return c!==l})}},assignSyncMedium:function(s){for(r=!0;n.length;){var l=n;n=[],l.forEach(s)}n={push:function(c){return s(c)},filter:function(){return n}}},assignMedium:function(s){r=!0;var l=[];if(n.length){var c=n;n=[],c.forEach(s),l=n}var f=function(){var h=l;l=[],h.forEach(s)},u=function(){return Promise.resolve().then(f)};u(),n={push:function(h){l.push(h),u()},filter:function(h){return l=l.filter(h),n}}}};return a}function kr(e){e===void 0&&(e={});var t=mr(null);return t.options=L({async:!0,ssr:!1},e),t}var Dt=function(e){var t=e.sideCar,n=At(e,["sideCar"]);if(!t)throw new Error("Sidecar: please provide `sideCar` property to import the right car");var r=t.read();if(!r)throw new Error("Sidecar medium not found");return o.createElement(r,L({},n))};Dt.isSideCarExport=!0;function gr(e,t){return e.useMedium(t),Dt}var Ot=kr(),Ee=function(){},ye=o.forwardRef(function(e,t){var n=o.useRef(null),r=o.useState({onScrollCapture:Ee,onWheelCapture:Ee,onTouchMoveCapture:Ee}),a=r[0],s=r[1],l=e.forwardProps,c=e.children,f=e.className,u=e.removeScrollBar,h=e.enabled,p=e.shards,m=e.sideCar,g=e.noRelative,S=e.noIsolation,d=e.inert,y=e.allowPinchZoom,w=e.as,k=w===void 0?"div":w,x=e.gapMode,b=At(e,["forwardProps","children","className","removeScrollBar","enabled","shards","sideCar","noRelative","noIsolation","inert","allowPinchZoom","as","gapMode"]),M=m,T=pr([n,t]),E=L(L({},b),a);return o.createElement(o.Fragment,null,h&&o.createElement(M,{sideCar:Ot,removeScrollBar:u,shards:p,noRelative:g,noIsolation:S,inert:d,setCallbacks:s,allowPinchZoom:!!y,lockRef:n,gapMode:x}),l?o.cloneElement(o.Children.only(c),L(L({},E),{ref:T})):o.createElement(k,L({},E,{className:f,ref:T}),c))});ye.defaultProps={enabled:!0,removeScrollBar:!0,inert:!1};ye.classNames={fullWidth:ue,zeroRight:le};var xr=function(){if(typeof __webpack_nonce__<"u")return __webpack_nonce__};function wr(){if(!document)return null;var e=document.createElement("style");e.type="text/css";var t=xr();return t&&e.setAttribute("nonce",t),e}function br(e,t){e.styleSheet?e.styleSheet.cssText=t:e.appendChild(document.createTextNode(t))}function Mr(e){var t=document.head||document.getElementsByTagName("head")[0];t.appendChild(e)}var Er=function(){var e=0,t=null;return{add:function(n){e==0&&(t=wr())&&(br(t,n),Mr(t)),e++},remove:function(){e--,!e&&t&&(t.parentNode&&t.parentNode.removeChild(t),t=null)}}},Cr=function(){var e=Er();return function(t,n){o.useEffect(function(){return e.add(t),function(){e.remove()}},[t&&n])}},Nt=function(){var e=Cr(),t=function(n){var r=n.styles,a=n.dynamic;return e(r,a),null};return t},Sr={left:0,top:0,right:0,gap:0},Ce=function(e){return parseInt(e||"",10)||0},Tr=function(e){var t=window.getComputedStyle(document.body),n=t[e==="padding"?"paddingLeft":"marginLeft"],r=t[e==="padding"?"paddingTop":"marginTop"],a=t[e==="padding"?"paddingRight":"marginRight"];return[Ce(n),Ce(r),Ce(a)]},Rr=function(e){if(e===void 0&&(e="margin"),typeof window>"u")return Sr;var t=Tr(e),n=document.documentElement.clientWidth,r=window.innerWidth;return{left:t[0],top:t[1],right:t[2],gap:Math.max(0,r-n+t[2]-t[0])}},Pr=Nt(),$="data-scroll-locked",Ar=function(e,t,n,r){var a=e.left,s=e.top,l=e.right,c=e.gap;return n===void 0&&(n="margin"),`
  .`.concat(dr,` {
   overflow: hidden `).concat(r,`;
   padding-right: `).concat(c,"px ").concat(r,`;
  }
  body[`).concat($,`] {
    overflow: hidden `).concat(r,`;
    overscroll-behavior: contain;
    `).concat([t&&"position: relative ".concat(r,";"),n==="margin"&&`
    padding-left: `.concat(a,`px;
    padding-top: `).concat(s,`px;
    padding-right: `).concat(l,`px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(c,"px ").concat(r,`;
    `),n==="padding"&&"padding-right: ".concat(c,"px ").concat(r,";")].filter(Boolean).join(""),`
  }
  
  .`).concat(le,` {
    right: `).concat(c,"px ").concat(r,`;
  }
  
  .`).concat(ue,` {
    margin-right: `).concat(c,"px ").concat(r,`;
  }
  
  .`).concat(le," .").concat(le,` {
    right: 0 `).concat(r,`;
  }
  
  .`).concat(ue," .").concat(ue,` {
    margin-right: 0 `).concat(r,`;
  }
  
  body[`).concat($,`] {
    `).concat(fr,": ").concat(c,`px;
  }
`)},tt=function(){var e=parseInt(document.body.getAttribute($)||"0",10);return isFinite(e)?e:0},Dr=function(){o.useEffect(function(){return document.body.setAttribute($,(tt()+1).toString()),function(){var e=tt()-1;e<=0?document.body.removeAttribute($):document.body.setAttribute($,e.toString())}},[])},Or=function(e){var t=e.noRelative,n=e.noImportant,r=e.gapMode,a=r===void 0?"margin":r;Dr();var s=o.useMemo(function(){return Rr(a)},[a]);return o.createElement(Pr,{styles:Ar(s,!t,a,n?"":"!important")})},De=!1;if(typeof window<"u")try{var oe=Object.defineProperty({},"passive",{get:function(){return De=!0,!0}});window.addEventListener("test",oe,oe),window.removeEventListener("test",oe,oe)}catch{De=!1}var W=De?{passive:!1}:!1,Nr=function(e){return e.tagName==="TEXTAREA"},Lt=function(e,t){if(!(e instanceof Element))return!1;var n=window.getComputedStyle(e);return n[t]!=="hidden"&&!(n.overflowY===n.overflowX&&!Nr(e)&&n[t]==="visible")},Lr=function(e){return Lt(e,"overflowY")},Ir=function(e){return Lt(e,"overflowX")},nt=function(e,t){var n=t.ownerDocument,r=t;do{typeof ShadowRoot<"u"&&r instanceof ShadowRoot&&(r=r.host);var a=It(e,r);if(a){var s=_t(e,r),l=s[1],c=s[2];if(l>c)return!0}r=r.parentNode}while(r&&r!==n.body);return!1},_r=function(e){var t=e.scrollTop,n=e.scrollHeight,r=e.clientHeight;return[t,n,r]},Fr=function(e){var t=e.scrollLeft,n=e.scrollWidth,r=e.clientWidth;return[t,n,r]},It=function(e,t){return e==="v"?Lr(t):Ir(t)},_t=function(e,t){return e==="v"?_r(t):Fr(t)},jr=function(e,t){return e==="h"&&t==="rtl"?-1:1},Vr=function(e,t,n,r,a){var s=jr(e,window.getComputedStyle(t).direction),l=s*r,c=n.target,f=t.contains(c),u=!1,h=l>0,p=0,m=0;do{if(!c)break;var g=_t(e,c),S=g[0],d=g[1],y=g[2],w=d-y-s*S;(S||w)&&It(e,c)&&(p+=w,m+=S);var k=c.parentNode;c=k&&k.nodeType===Node.DOCUMENT_FRAGMENT_NODE?k.host:k}while(!f&&c!==document.body||f&&(t.contains(c)||t===c));return(h&&Math.abs(p)<1||!h&&Math.abs(m)<1)&&(u=!0),u},se=function(e){return"changedTouches"in e?[e.changedTouches[0].clientX,e.changedTouches[0].clientY]:[0,0]},rt=function(e){return[e.deltaX,e.deltaY]},at=function(e){return e&&"current"in e?e.current:e},Hr=function(e,t){return e[0]===t[0]&&e[1]===t[1]},zr=function(e){return`
  .block-interactivity-`.concat(e,` {pointer-events: none;}
  .allow-interactivity-`).concat(e,` {pointer-events: all;}
`)},qr=0,U=[];function Wr(e){var t=o.useRef([]),n=o.useRef([0,0]),r=o.useRef(),a=o.useState(qr++)[0],s=o.useState(Nt)[0],l=o.useRef(e);o.useEffect(function(){l.current=e},[e]),o.useEffect(function(){if(e.inert){document.body.classList.add("block-interactivity-".concat(a));var d=ur([e.lockRef.current],(e.shards||[]).map(at),!0).filter(Boolean);return d.forEach(function(y){return y.classList.add("allow-interactivity-".concat(a))}),function(){document.body.classList.remove("block-interactivity-".concat(a)),d.forEach(function(y){return y.classList.remove("allow-interactivity-".concat(a))})}}},[e.inert,e.lockRef.current,e.shards]);var c=o.useCallback(function(d,y){if("touches"in d&&d.touches.length===2||d.type==="wheel"&&d.ctrlKey)return!l.current.allowPinchZoom;var w=se(d),k=n.current,x="deltaX"in d?d.deltaX:k[0]-w[0],b="deltaY"in d?d.deltaY:k[1]-w[1],M,T=d.target,E=Math.abs(x)>Math.abs(b)?"h":"v";if("touches"in d&&E==="h"&&T.type==="range")return!1;var A=nt(E,T);if(!A)return!0;if(A?M=E:(M=E==="v"?"h":"v",A=nt(E,T)),!A)return!1;if(!r.current&&"changedTouches"in d&&(x||b)&&(r.current=M),!M)return!0;var D=r.current||M;return Vr(D,y,d,D==="h"?x:b)},[]),f=o.useCallback(function(d){var y=d;if(!(!U.length||U[U.length-1]!==s)){var w="deltaY"in y?rt(y):se(y),k=t.current.filter(function(M){return M.name===y.type&&(M.target===y.target||y.target===M.shadowParent)&&Hr(M.delta,w)})[0];if(k&&k.should){y.cancelable&&y.preventDefault();return}if(!k){var x=(l.current.shards||[]).map(at).filter(Boolean).filter(function(M){return M.contains(y.target)}),b=x.length>0?c(y,x[0]):!l.current.noIsolation;b&&y.cancelable&&y.preventDefault()}}},[]),u=o.useCallback(function(d,y,w,k){var x={name:d,delta:y,target:w,should:k,shadowParent:Ur(w)};t.current.push(x),setTimeout(function(){t.current=t.current.filter(function(b){return b!==x})},1)},[]),h=o.useCallback(function(d){n.current=se(d),r.current=void 0},[]),p=o.useCallback(function(d){u(d.type,rt(d),d.target,c(d,e.lockRef.current))},[]),m=o.useCallback(function(d){u(d.type,se(d),d.target,c(d,e.lockRef.current))},[]);o.useEffect(function(){return U.push(s),e.setCallbacks({onScrollCapture:p,onWheelCapture:p,onTouchMoveCapture:m}),document.addEventListener("wheel",f,W),document.addEventListener("touchmove",f,W),document.addEventListener("touchstart",h,W),function(){U=U.filter(function(d){return d!==s}),document.removeEventListener("wheel",f,W),document.removeEventListener("touchmove",f,W),document.removeEventListener("touchstart",h,W)}},[]);var g=e.removeScrollBar,S=e.inert;return o.createElement(o.Fragment,null,S?o.createElement(s,{styles:zr(a)}):null,g?o.createElement(Or,{noRelative:e.noRelative,gapMode:e.gapMode}):null)}function Ur(e){for(var t=null;e!==null;)e instanceof ShadowRoot&&(t=e.host,e=e.host),e=e.parentNode;return t}const Br=gr(Ot,Wr);var Ft=o.forwardRef(function(e,t){return o.createElement(ye,L({},e,{ref:t,sideCar:Br}))});Ft.classNames=ye.classNames;var $r=function(e){if(typeof document>"u")return null;var t=Array.isArray(e)?e[0]:e;return t.ownerDocument.body},B=new WeakMap,ce=new WeakMap,ie={},Se=0,jt=function(e){return e&&(e.host||jt(e.parentNode))},Kr=function(e,t){return t.map(function(n){if(e.contains(n))return n;var r=jt(n);return r&&e.contains(r)?r:(console.error("aria-hidden",n,"in not contained inside",e,". Doing nothing"),null)}).filter(function(n){return!!n})},Xr=function(e,t,n,r){var a=Kr(t,Array.isArray(e)?e:[e]);ie[n]||(ie[n]=new WeakMap);var s=ie[n],l=[],c=new Set,f=new Set(a),u=function(p){!p||c.has(p)||(c.add(p),u(p.parentNode))};a.forEach(u);var h=function(p){!p||f.has(p)||Array.prototype.forEach.call(p.children,function(m){if(c.has(m))h(m);else try{var g=m.getAttribute(r),S=g!==null&&g!=="false",d=(B.get(m)||0)+1,y=(s.get(m)||0)+1;B.set(m,d),s.set(m,y),l.push(m),d===1&&S&&ce.set(m,!0),y===1&&m.setAttribute(n,"true"),S||m.setAttribute(r,"true")}catch(w){console.error("aria-hidden: cannot operate on ",m,w)}})};return h(t),c.clear(),Se++,function(){l.forEach(function(p){var m=B.get(p)-1,g=s.get(p)-1;B.set(p,m),s.set(p,g),m||(ce.has(p)||p.removeAttribute(r),ce.delete(p)),g||p.removeAttribute(n)}),Se--,Se||(B=new WeakMap,B=new WeakMap,ce=new WeakMap,ie={})}},Zr=function(e,t,n){n===void 0&&(n="data-aria-hidden");var r=Array.from(Array.isArray(e)?e:[e]),a=$r(e);return a?(r.push.apply(r,Array.from(a.querySelectorAll("[aria-live], script"))),Xr(r,a,n,"aria-hidden")):function(){return null}},pe="Dialog",[Vt,Is]=Oe(pe),[Yr,N]=Vt(pe),Ht=e=>{const{__scopeDialog:t,children:n,open:r,defaultOpen:a,onOpenChange:s,modal:l=!0}=e,c=o.useRef(null),f=o.useRef(null),[u,h]=ht({prop:r,defaultProp:a??!1,onChange:s,caller:pe});return v.jsx(Yr,{scope:t,triggerRef:c,contentRef:f,contentId:ge(),titleId:ge(),descriptionId:ge(),open:u,onOpenChange:h,onOpenToggle:o.useCallback(()=>h(p=>!p),[h]),modal:l,children:n})};Ht.displayName=pe;var zt="DialogTrigger",qt=o.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=N(zt,n),s=O(t,a.triggerRef);return v.jsx(P.button,{type:"button","aria-haspopup":"dialog","aria-expanded":a.open,"aria-controls":a.contentId,"data-state":He(a.open),...r,ref:s,onClick:R(e.onClick,a.onOpenToggle)})});qt.displayName=zt;var je="DialogPortal",[Gr,Wt]=Vt(je,{forceMount:void 0}),Ut=e=>{const{__scopeDialog:t,forceMount:n,children:r,container:a}=e,s=N(je,t);return v.jsx(Gr,{scope:t,forceMount:n,children:o.Children.map(r,l=>v.jsx(J,{present:n||s.open,children:v.jsx(Le,{asChild:!0,container:a,children:l})}))})};Ut.displayName=je;var de="DialogOverlay",Bt=o.forwardRef((e,t)=>{const n=Wt(de,e.__scopeDialog),{forceMount:r=n.forceMount,...a}=e,s=N(de,e.__scopeDialog);return s.modal?v.jsx(J,{present:r||s.open,children:v.jsx(Qr,{...a,ref:t})}):null});Bt.displayName=de;var Jr=G("DialogOverlay.RemoveScroll"),Qr=o.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=N(de,n);return v.jsx(Ft,{as:Jr,allowPinchZoom:!0,shards:[a.contentRef],children:v.jsx(P.div,{"data-state":He(a.open),...r,ref:t,style:{pointerEvents:"auto",...r.style}})})}),q="DialogContent",$t=o.forwardRef((e,t)=>{const n=Wt(q,e.__scopeDialog),{forceMount:r=n.forceMount,...a}=e,s=N(q,e.__scopeDialog);return v.jsx(J,{present:r||s.open,children:s.modal?v.jsx(ea,{...a,ref:t}):v.jsx(ta,{...a,ref:t})})});$t.displayName=q;var ea=o.forwardRef((e,t)=>{const n=N(q,e.__scopeDialog),r=o.useRef(null),a=O(t,n.contentRef,r);return o.useEffect(()=>{const s=r.current;if(s)return Zr(s)},[]),v.jsx(Kt,{...e,ref:a,trapFocus:n.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:R(e.onCloseAutoFocus,s=>{s.preventDefault(),n.triggerRef.current?.focus()}),onPointerDownOutside:R(e.onPointerDownOutside,s=>{const l=s.detail.originalEvent,c=l.button===0&&l.ctrlKey===!0;(l.button===2||c)&&s.preventDefault()}),onFocusOutside:R(e.onFocusOutside,s=>s.preventDefault())})}),ta=o.forwardRef((e,t)=>{const n=N(q,e.__scopeDialog),r=o.useRef(!1),a=o.useRef(!1);return v.jsx(Kt,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:s=>{e.onCloseAutoFocus?.(s),s.defaultPrevented||(r.current||n.triggerRef.current?.focus(),s.preventDefault()),r.current=!1,a.current=!1},onInteractOutside:s=>{e.onInteractOutside?.(s),s.defaultPrevented||(r.current=!0,s.detail.originalEvent.type==="pointerdown"&&(a.current=!0));const l=s.target;n.triggerRef.current?.contains(l)&&s.preventDefault(),s.detail.originalEvent.type==="focusin"&&a.current&&s.preventDefault()}})}),Kt=o.forwardRef((e,t)=>{const{__scopeDialog:n,trapFocus:r,onOpenAutoFocus:a,onCloseAutoFocus:s,...l}=e,c=N(q,n),f=o.useRef(null),u=O(t,f);return lr(),v.jsxs(v.Fragment,{children:[v.jsx(Rt,{asChild:!0,loop:!0,trapped:r,onMountAutoFocus:a,onUnmountAutoFocus:s,children:v.jsx(Ne,{role:"dialog",id:c.contentId,"aria-describedby":c.descriptionId,"aria-labelledby":c.titleId,"data-state":He(c.open),...l,ref:u,onDismiss:()=>c.onOpenChange(!1)})}),v.jsxs(v.Fragment,{children:[v.jsx(na,{titleId:c.titleId}),v.jsx(aa,{contentRef:f,descriptionId:c.descriptionId})]})]})}),Ve="DialogTitle",Xt=o.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=N(Ve,n);return v.jsx(P.h2,{id:a.titleId,...r,ref:t})});Xt.displayName=Ve;var Zt="DialogDescription",Yt=o.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=N(Zt,n);return v.jsx(P.p,{id:a.descriptionId,...r,ref:t})});Yt.displayName=Zt;var Gt="DialogClose",Jt=o.forwardRef((e,t)=>{const{__scopeDialog:n,...r}=e,a=N(Gt,n);return v.jsx(P.button,{type:"button",...r,ref:t,onClick:R(e.onClick,()=>a.onOpenChange(!1))})});Jt.displayName=Gt;function He(e){return e?"open":"closed"}var Qt="DialogTitleWarning",[_s,en]=cn(Qt,{contentName:q,titleName:Ve,docsSlug:"dialog"}),na=({titleId:e})=>{const t=en(Qt),n=`\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;return o.useEffect(()=>{e&&(document.getElementById(e)||console.error(n))},[n,e]),null},ra="DialogDescriptionWarning",aa=({contentRef:e,descriptionId:t})=>{const r=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${en(ra).contentName}}.`;return o.useEffect(()=>{const a=e.current?.getAttribute("aria-describedby");t&&a&&(document.getElementById(t)||console.warn(r))},[r,e,t]),null},Fs=Ht,js=qt,Vs=Ut,Hs=Bt,zs=$t,qs=Xt,Ws=Yt,Us=Jt;export{Ft as $,ya as A,Sa as B,pa as C,ha as D,ct as E,io as F,js as G,ss as H,Rs as I,Za as J,Xa as K,Eo as L,qo as M,Fa as N,Hs as O,la as P,yn as Q,da as R,sa as S,fa as T,Ps as U,ua as V,bs as W,Ls as X,Le as Y,Zr as Z,lr as _,P as a,Do as a$,G as a0,Rt as a1,On as a2,Na as a3,_a as a4,Oa as a5,Is as a6,_s as a7,Yo as a8,xs as a9,Aa as aA,Bo as aB,So as aC,Co as aD,Io as aE,eo as aF,lt as aG,qa as aH,Oo as aI,bo as aJ,Po as aK,co as aL,Da as aM,Ja as aN,ns as aO,za as aP,Pa as aQ,us as aR,rs as aS,Lo as aT,gs as aU,Ms as aV,ma as aW,Wa as aX,zo as aY,ws as aZ,ks as a_,so as aa,Ga as ab,Ss as ac,Va as ad,Jo as ae,Ta as af,Ha as ag,fs as ah,Ia as ai,La as aj,No as ak,cs as al,Zo as am,lo as an,wo as ao,Wo as ap,Ds as aq,ba as ar,Xo as as,Go as at,hs as au,Ua as av,as as aw,Vo as ax,Ko as ay,go as az,O as b,Ma as b0,Ho as b1,jo as b2,Cs as b3,ts as b4,Ca as b5,Mo as b6,ps as b7,$a as b8,po as b9,Ro as bA,As as bB,ys as bC,os as bD,xo as bE,es as bF,oo as bG,ao as bH,Qa as bI,Ra as bJ,Ts as bK,Ns as bL,Os as bM,vo as ba,mo as bb,Ao as bc,Qo as bd,xa as be,ka as bf,wa as bg,ga as bh,ko as bi,ro as bj,ms as bk,To as bl,Ba as bm,fo as bn,ja as bo,va as bp,Fo as bq,yo as br,to as bs,uo as bt,Ka as bu,Ya as bv,ho as bw,no as bx,Uo as by,Es as bz,Oe as c,_ as d,J as e,Ne as f,ca as g,ia as h,ge as i,v as j,ht as k,R as l,Vs as m,zs as n,Us as o,qs as p,Ws as q,Fs as r,$o as s,ds as t,K as u,Ea as v,ls as w,is as x,_o as y,vs as z};
