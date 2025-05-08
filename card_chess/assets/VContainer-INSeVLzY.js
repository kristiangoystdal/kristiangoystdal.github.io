import{ae as ti,g as X,b as ee,M as dl,K as Or,O as hl,p as D,U as Ue,k as V,t as te,af as ni,ag as Mr,ah as It,ai as ws,aj as fl,ak as _l,al as pl,e as g,W as Zt,am as gl,d as Lr,C as U,X as xe,an as ml,ao as vl,u as re,ap as yl,aq as Cl,m as wn,a as He,I as Ze,A as Fr,ar as Ni,o as Br,w as Qt,V as Ai,l as bl,c as Ri,as as Es,at as wl,N as Vr,au as El,av as Is,r as Ss,s as Il,f as $r,aw as Sl,ax as Ts,F as Pi,H as Di,T as Tl,z as xi,Y as kl,E as Nl,G as ii,a0 as Wr,P as Al,J as ks}from"./index-uY0FTaRm.js";const Rl=["top","bottom"],Pl=["start","end","left","right"];function Dl(t,e){let[n,i]=t.split(" ");return i||(i=ti(Rl,n)?"start":ti(Pl,n)?"top":"center"),{side:Ns(n,e),align:Ns(i,e)}}function Ns(t,e){return t==="start"?e?"right":"left":t==="end"?e?"left":"right":t}function xl(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"div",n=arguments.length>2?arguments[2]:void 0;return X()({name:n??dl(hl(t.replace(/__/g,"-"))),props:{tag:{type:String,default:e},...ee()},setup(i,s){let{slots:r}=s;return()=>{var o;return Or(i.tag,{class:[t,i.class],style:i.style},(o=r.default)==null?void 0:o.call(r))}}})}const Ol=()=>{};var As={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ur={NODE_ADMIN:!1,SDK_VERSION:"${JSCORE_VERSION}"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _=function(t,e){if(!t)throw at(e)},at=function(t){return new Error("Firebase Database ("+Ur.SDK_VERSION+") INTERNAL ASSERT FAILED: "+t)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hr=function(t){const e=[];let n=0;for(let i=0;i<t.length;i++){let s=t.charCodeAt(i);s<128?e[n++]=s:s<2048?(e[n++]=s>>6|192,e[n++]=s&63|128):(s&64512)===55296&&i+1<t.length&&(t.charCodeAt(i+1)&64512)===56320?(s=65536+((s&1023)<<10)+(t.charCodeAt(++i)&1023),e[n++]=s>>18|240,e[n++]=s>>12&63|128,e[n++]=s>>6&63|128,e[n++]=s&63|128):(e[n++]=s>>12|224,e[n++]=s>>6&63|128,e[n++]=s&63|128)}return e},Ml=function(t){const e=[];let n=0,i=0;for(;n<t.length;){const s=t[n++];if(s<128)e[i++]=String.fromCharCode(s);else if(s>191&&s<224){const r=t[n++];e[i++]=String.fromCharCode((s&31)<<6|r&63)}else if(s>239&&s<365){const r=t[n++],o=t[n++],a=t[n++],l=((s&7)<<18|(r&63)<<12|(o&63)<<6|a&63)-65536;e[i++]=String.fromCharCode(55296+(l>>10)),e[i++]=String.fromCharCode(56320+(l&1023))}else{const r=t[n++],o=t[n++];e[i++]=String.fromCharCode((s&15)<<12|(r&63)<<6|o&63)}}return e.join("")},Oi={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(t,e){if(!Array.isArray(t))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,i=[];for(let s=0;s<t.length;s+=3){const r=t[s],o=s+1<t.length,a=o?t[s+1]:0,l=s+2<t.length,c=l?t[s+2]:0,u=r>>2,d=(r&3)<<4|a>>4;let h=(a&15)<<2|c>>6,f=c&63;l||(f=64,o||(h=64)),i.push(n[u],n[d],n[h],n[f])}return i.join("")},encodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(t):this.encodeByteArray(Hr(t),e)},decodeString(t,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(t):Ml(this.decodeStringToByteArray(t,e))},decodeStringToByteArray(t,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,i=[];for(let s=0;s<t.length;){const r=n[t.charAt(s++)],a=s<t.length?n[t.charAt(s)]:0;++s;const c=s<t.length?n[t.charAt(s)]:64;++s;const d=s<t.length?n[t.charAt(s)]:64;if(++s,r==null||a==null||c==null||d==null)throw new Ll;const h=r<<2|a>>4;if(i.push(h),c!==64){const f=a<<4&240|c>>2;if(i.push(f),d!==64){const p=c<<6&192|d;i.push(p)}}}return i},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let t=0;t<this.ENCODED_VALS.length;t++)this.byteToCharMap_[t]=this.ENCODED_VALS.charAt(t),this.charToByteMap_[this.byteToCharMap_[t]]=t,this.byteToCharMapWebSafe_[t]=this.ENCODED_VALS_WEBSAFE.charAt(t),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[t]]=t,t>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(t)]=t,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(t)]=t)}}};class Ll extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const zr=function(t){const e=Hr(t);return Oi.encodeByteArray(e,!0)},en=function(t){return zr(t).replace(/\./g,"")},si=function(t){try{return Oi.decodeString(t,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fl(t){return jr(void 0,t)}function jr(t,e){if(!(e instanceof Object))return e;switch(e.constructor){case Date:const n=e;return new Date(n.getTime());case Object:t===void 0&&(t={});break;case Array:t=[];break;default:return e}for(const n in e)!e.hasOwnProperty(n)||!Bl(n)||(t[n]=jr(t[n],e[n]));return t}function Bl(t){return t!=="__proto__"}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vl(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $l=()=>Vl().__FIREBASE_DEFAULTS__,Wl=()=>{if(typeof process>"u"||typeof As>"u")return;const t=As.__FIREBASE_DEFAULTS__;if(t)return JSON.parse(t)},Ul=()=>{if(typeof document>"u")return;let t;try{t=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=t&&si(t[1]);return e&&JSON.parse(e)},qr=()=>{try{return Ol()||$l()||Wl()||Ul()}catch(t){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${t}`);return}},Hl=t=>{var e,n;return(n=(e=qr())===null||e===void 0?void 0:e.emulatorHosts)===null||n===void 0?void 0:n[t]},zl=t=>{const e=Hl(t);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const i=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),i]:[e.substring(0,n),i]},Gr=()=>{var t;return(t=qr())===null||t===void 0?void 0:t.config};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ae{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,i)=>{n?this.reject(n):this.resolve(i),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,i))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jl(t,e){if(t.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},i=e||"demo-project",s=t.iat||0,r=t.sub||t.user_id;if(!r)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const o=Object.assign({iss:`https://securetoken.google.com/${i}`,aud:i,iat:s,exp:s+3600,auth_time:s,sub:r,user_id:r,firebase:{sign_in_provider:"custom",identities:{}}},t);return[en(JSON.stringify(n)),en(JSON.stringify(o)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ql(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Yr(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(ql())}function Gl(){const t=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof t=="object"&&t.id!==void 0}function Yl(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Kl(){return Ur.NODE_ADMIN===!0}function Kr(){try{return typeof indexedDB=="object"}catch{return!1}}function Qr(){return new Promise((t,e)=>{try{let n=!0;const i="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(i);s.onsuccess=()=>{s.result.close(),n||self.indexedDB.deleteDatabase(i),t(!0)},s.onupgradeneeded=()=>{n=!1},s.onerror=()=>{var r;e(((r=s.error)===null||r===void 0?void 0:r.message)||"")}}catch(n){e(n)}})}function Ql(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xl="FirebaseError";class ze extends Error{constructor(e,n,i){super(n),this.code=e,this.customData=i,this.name=Xl,Object.setPrototypeOf(this,ze.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,En.prototype.create)}}class En{constructor(e,n,i){this.service=e,this.serviceName=n,this.errors=i}create(e,...n){const i=n[0]||{},s=`${this.service}/${e}`,r=this.errors[e],o=r?Jl(r,i):"Error",a=`${this.serviceName}: ${o} (${s}).`;return new ze(s,a,i)}}function Jl(t,e){return t.replace(Zl,(n,i)=>{const s=e[i];return s!=null?String(s):`<${i}?>`})}const Zl=/\{\$([^}]+)}/g;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function St(t){return JSON.parse(t)}function O(t){return JSON.stringify(t)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xr=function(t){let e={},n={},i={},s="";try{const r=t.split(".");e=St(si(r[0])||""),n=St(si(r[1])||""),s=r[2],i=n.d||{},delete n.d}catch{}return{header:e,claims:n,data:i,signature:s}},ec=function(t){const e=Xr(t),n=e.claims;return!!n&&typeof n=="object"&&n.hasOwnProperty("iat")},tc=function(t){const e=Xr(t).claims;return typeof e=="object"&&e.admin===!0};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ce(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function et(t,e){if(Object.prototype.hasOwnProperty.call(t,e))return t[e]}function ri(t){for(const e in t)if(Object.prototype.hasOwnProperty.call(t,e))return!1;return!0}function tn(t,e,n){const i={};for(const s in t)Object.prototype.hasOwnProperty.call(t,s)&&(i[s]=e.call(n,t[s],s,t));return i}function Tt(t,e){if(t===e)return!0;const n=Object.keys(t),i=Object.keys(e);for(const s of n){if(!i.includes(s))return!1;const r=t[s],o=e[s];if(Rs(r)&&Rs(o)){if(!Tt(r,o))return!1}else if(r!==o)return!1}for(const s of i)if(!n.includes(s))return!1;return!0}function Rs(t){return t!==null&&typeof t=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nc(t){const e=[];for(const[n,i]of Object.entries(t))Array.isArray(i)?i.forEach(s=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(s))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(i));return e.length?"&"+e.join("&"):""}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ic{constructor(){this.chain_=[],this.buf_=[],this.W_=[],this.pad_=[],this.inbuf_=0,this.total_=0,this.blockSize=512/8,this.pad_[0]=128;for(let e=1;e<this.blockSize;++e)this.pad_[e]=0;this.reset()}reset(){this.chain_[0]=1732584193,this.chain_[1]=4023233417,this.chain_[2]=2562383102,this.chain_[3]=271733878,this.chain_[4]=3285377520,this.inbuf_=0,this.total_=0}compress_(e,n){n||(n=0);const i=this.W_;if(typeof e=="string")for(let d=0;d<16;d++)i[d]=e.charCodeAt(n)<<24|e.charCodeAt(n+1)<<16|e.charCodeAt(n+2)<<8|e.charCodeAt(n+3),n+=4;else for(let d=0;d<16;d++)i[d]=e[n]<<24|e[n+1]<<16|e[n+2]<<8|e[n+3],n+=4;for(let d=16;d<80;d++){const h=i[d-3]^i[d-8]^i[d-14]^i[d-16];i[d]=(h<<1|h>>>31)&4294967295}let s=this.chain_[0],r=this.chain_[1],o=this.chain_[2],a=this.chain_[3],l=this.chain_[4],c,u;for(let d=0;d<80;d++){d<40?d<20?(c=a^r&(o^a),u=1518500249):(c=r^o^a,u=1859775393):d<60?(c=r&o|a&(r|o),u=2400959708):(c=r^o^a,u=3395469782);const h=(s<<5|s>>>27)+c+l+u+i[d]&4294967295;l=a,a=o,o=(r<<30|r>>>2)&4294967295,r=s,s=h}this.chain_[0]=this.chain_[0]+s&4294967295,this.chain_[1]=this.chain_[1]+r&4294967295,this.chain_[2]=this.chain_[2]+o&4294967295,this.chain_[3]=this.chain_[3]+a&4294967295,this.chain_[4]=this.chain_[4]+l&4294967295}update(e,n){if(e==null)return;n===void 0&&(n=e.length);const i=n-this.blockSize;let s=0;const r=this.buf_;let o=this.inbuf_;for(;s<n;){if(o===0)for(;s<=i;)this.compress_(e,s),s+=this.blockSize;if(typeof e=="string"){for(;s<n;)if(r[o]=e.charCodeAt(s),++o,++s,o===this.blockSize){this.compress_(r),o=0;break}}else for(;s<n;)if(r[o]=e[s],++o,++s,o===this.blockSize){this.compress_(r),o=0;break}}this.inbuf_=o,this.total_+=n}digest(){const e=[];let n=this.total_*8;this.inbuf_<56?this.update(this.pad_,56-this.inbuf_):this.update(this.pad_,this.blockSize-(this.inbuf_-56));for(let s=this.blockSize-1;s>=56;s--)this.buf_[s]=n&255,n/=256;this.compress_(this.buf_);let i=0;for(let s=0;s<5;s++)for(let r=24;r>=0;r-=8)e[i]=this.chain_[s]>>r&255,++i;return e}}function tt(t,e){return`${t} failed: ${e} argument `}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sc=function(t){const e=[];let n=0;for(let i=0;i<t.length;i++){let s=t.charCodeAt(i);if(s>=55296&&s<=56319){const r=s-55296;i++,_(i<t.length,"Surrogate pair missing trail surrogate.");const o=t.charCodeAt(i)-56320;s=65536+(r<<10)+o}s<128?e[n++]=s:s<2048?(e[n++]=s>>6|192,e[n++]=s&63|128):s<65536?(e[n++]=s>>12|224,e[n++]=s>>6&63|128,e[n++]=s&63|128):(e[n++]=s>>18|240,e[n++]=s>>12&63|128,e[n++]=s>>6&63|128,e[n++]=s&63|128)}return e},In=function(t){let e=0;for(let n=0;n<t.length;n++){const i=t.charCodeAt(n);i<128?e++:i<2048?e+=2:i>=55296&&i<=56319?(e+=4,n++):e+=3}return e};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rc=1e3,oc=2,ac=4*60*60*1e3,lc=.5;function Ps(t,e=rc,n=oc){const i=e*Math.pow(n,t),s=Math.round(lc*i*(Math.random()-.5)*2);return Math.min(ac,i+s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ue(t){return t&&t._delegate?t._delegate:t}class fe{constructor(e,n,i){this.name=e,this.instanceFactory=n,this.type=i,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pe="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cc{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const i=new ae;if(this.instancesDeferred.set(n,i),this.isInitialized(n)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:n});s&&i.resolve(s)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){var n;const i=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),s=(n=e==null?void 0:e.optional)!==null&&n!==void 0?n:!1;if(this.isInitialized(i)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:i})}catch(r){if(s)return null;throw r}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(dc(e))try{this.getOrInitializeService({instanceIdentifier:Pe})}catch{}for(const[n,i]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(n);try{const r=this.getOrInitializeService({instanceIdentifier:s});i.resolve(r)}catch{}}}}clearInstance(e=Pe){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Pe){return this.instances.has(e)}getOptions(e=Pe){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,i=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(i))throw Error(`${this.name}(${i}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:i,options:n});for(const[r,o]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(r);i===a&&o.resolve(s)}return s}onInit(e,n){var i;const s=this.normalizeInstanceIdentifier(n),r=(i=this.onInitCallbacks.get(s))!==null&&i!==void 0?i:new Set;r.add(e),this.onInitCallbacks.set(s,r);const o=this.instances.get(s);return o&&e(o,s),()=>{r.delete(e)}}invokeOnInitCallbacks(e,n){const i=this.onInitCallbacks.get(n);if(i)for(const s of i)try{s(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let i=this.instances.get(e);if(!i&&this.component&&(i=this.component.instanceFactory(this.container,{instanceIdentifier:uc(e),options:n}),this.instances.set(e,i),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(i,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,i)}catch{}return i||null}normalizeInstanceIdentifier(e=Pe){return this.component?this.component.multipleInstances?e:Pe:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function uc(t){return t===Pe?void 0:t}function dc(t){return t.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hc{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new cc(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var N;(function(t){t[t.DEBUG=0]="DEBUG",t[t.VERBOSE=1]="VERBOSE",t[t.INFO=2]="INFO",t[t.WARN=3]="WARN",t[t.ERROR=4]="ERROR",t[t.SILENT=5]="SILENT"})(N||(N={}));const fc={debug:N.DEBUG,verbose:N.VERBOSE,info:N.INFO,warn:N.WARN,error:N.ERROR,silent:N.SILENT},_c=N.INFO,pc={[N.DEBUG]:"log",[N.VERBOSE]:"log",[N.INFO]:"info",[N.WARN]:"warn",[N.ERROR]:"error"},gc=(t,e,...n)=>{if(e<t.logLevel)return;const i=new Date().toISOString(),s=pc[e];if(s)console[s](`[${i}]  ${t.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class Mi{constructor(e){this.name=e,this._logLevel=_c,this._logHandler=gc,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in N))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?fc[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,N.DEBUG,...e),this._logHandler(this,N.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,N.VERBOSE,...e),this._logHandler(this,N.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,N.INFO,...e),this._logHandler(this,N.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,N.WARN,...e),this._logHandler(this,N.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,N.ERROR,...e),this._logHandler(this,N.ERROR,...e)}}const mc=(t,e)=>e.some(n=>t instanceof n);let Ds,xs;function vc(){return Ds||(Ds=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function yc(){return xs||(xs=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Jr=new WeakMap,oi=new WeakMap,Zr=new WeakMap,Wn=new WeakMap,Li=new WeakMap;function Cc(t){const e=new Promise((n,i)=>{const s=()=>{t.removeEventListener("success",r),t.removeEventListener("error",o)},r=()=>{n(be(t.result)),s()},o=()=>{i(t.error),s()};t.addEventListener("success",r),t.addEventListener("error",o)});return e.then(n=>{n instanceof IDBCursor&&Jr.set(n,t)}).catch(()=>{}),Li.set(e,t),e}function bc(t){if(oi.has(t))return;const e=new Promise((n,i)=>{const s=()=>{t.removeEventListener("complete",r),t.removeEventListener("error",o),t.removeEventListener("abort",o)},r=()=>{n(),s()},o=()=>{i(t.error||new DOMException("AbortError","AbortError")),s()};t.addEventListener("complete",r),t.addEventListener("error",o),t.addEventListener("abort",o)});oi.set(t,e)}let ai={get(t,e,n){if(t instanceof IDBTransaction){if(e==="done")return oi.get(t);if(e==="objectStoreNames")return t.objectStoreNames||Zr.get(t);if(e==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return be(t[e])},set(t,e,n){return t[e]=n,!0},has(t,e){return t instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in t}};function wc(t){ai=t(ai)}function Ec(t){return t===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...n){const i=t.call(Un(this),e,...n);return Zr.set(i,e.sort?e.sort():[e]),be(i)}:yc().includes(t)?function(...e){return t.apply(Un(this),e),be(Jr.get(this))}:function(...e){return be(t.apply(Un(this),e))}}function Ic(t){return typeof t=="function"?Ec(t):(t instanceof IDBTransaction&&bc(t),mc(t,vc())?new Proxy(t,ai):t)}function be(t){if(t instanceof IDBRequest)return Cc(t);if(Wn.has(t))return Wn.get(t);const e=Ic(t);return e!==t&&(Wn.set(t,e),Li.set(e,t)),e}const Un=t=>Li.get(t);function eo(t,e,{blocked:n,upgrade:i,blocking:s,terminated:r}={}){const o=indexedDB.open(t,e),a=be(o);return i&&o.addEventListener("upgradeneeded",l=>{i(be(o.result),l.oldVersion,l.newVersion,be(o.transaction),l)}),n&&o.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{r&&l.addEventListener("close",()=>r()),s&&l.addEventListener("versionchange",c=>s(c.oldVersion,c.newVersion,c))}).catch(()=>{}),a}const Sc=["get","getKey","getAll","getAllKeys","count"],Tc=["put","add","delete","clear"],Hn=new Map;function Os(t,e){if(!(t instanceof IDBDatabase&&!(e in t)&&typeof e=="string"))return;if(Hn.get(e))return Hn.get(e);const n=e.replace(/FromIndex$/,""),i=e!==n,s=Tc.includes(n);if(!(n in(i?IDBIndex:IDBObjectStore).prototype)||!(s||Sc.includes(n)))return;const r=async function(o,...a){const l=this.transaction(o,s?"readwrite":"readonly");let c=l.store;return i&&(c=c.index(a.shift())),(await Promise.all([c[n](...a),s&&l.done]))[0]};return Hn.set(e,r),r}wc(t=>({...t,get:(e,n,i)=>Os(e,n)||t.get(e,n,i),has:(e,n)=>!!Os(e,n)||t.has(e,n)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kc{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(Nc(n)){const i=n.getImmediate();return`${i.library}/${i.version}`}else return null}).filter(n=>n).join(" ")}}function Nc(t){const e=t.getComponent();return(e==null?void 0:e.type)==="VERSION"}const li="@firebase/app",Ms="0.11.5";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _e=new Mi("@firebase/app"),Ac="@firebase/app-compat",Rc="@firebase/analytics-compat",Pc="@firebase/analytics",Dc="@firebase/app-check-compat",xc="@firebase/app-check",Oc="@firebase/auth",Mc="@firebase/auth-compat",Lc="@firebase/database",Fc="@firebase/data-connect",Bc="@firebase/database-compat",Vc="@firebase/functions",$c="@firebase/functions-compat",Wc="@firebase/installations",Uc="@firebase/installations-compat",Hc="@firebase/messaging",zc="@firebase/messaging-compat",jc="@firebase/performance",qc="@firebase/performance-compat",Gc="@firebase/remote-config",Yc="@firebase/remote-config-compat",Kc="@firebase/storage",Qc="@firebase/storage-compat",Xc="@firebase/firestore",Jc="@firebase/vertexai",Zc="@firebase/firestore-compat",eu="firebase",tu="11.6.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ci="[DEFAULT]",nu={[li]:"fire-core",[Ac]:"fire-core-compat",[Pc]:"fire-analytics",[Rc]:"fire-analytics-compat",[xc]:"fire-app-check",[Dc]:"fire-app-check-compat",[Oc]:"fire-auth",[Mc]:"fire-auth-compat",[Lc]:"fire-rtdb",[Fc]:"fire-data-connect",[Bc]:"fire-rtdb-compat",[Vc]:"fire-fn",[$c]:"fire-fn-compat",[Wc]:"fire-iid",[Uc]:"fire-iid-compat",[Hc]:"fire-fcm",[zc]:"fire-fcm-compat",[jc]:"fire-perf",[qc]:"fire-perf-compat",[Gc]:"fire-rc",[Yc]:"fire-rc-compat",[Kc]:"fire-gcs",[Qc]:"fire-gcs-compat",[Xc]:"fire-fst",[Zc]:"fire-fst-compat",[Jc]:"fire-vertex","fire-js":"fire-js",[eu]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nn=new Map,iu=new Map,ui=new Map;function Ls(t,e){try{t.container.addComponent(e)}catch(n){_e.debug(`Component ${e.name} failed to register with FirebaseApp ${t.name}`,n)}}function Se(t){const e=t.name;if(ui.has(e))return _e.debug(`There were multiple attempts to register component ${e}.`),!1;ui.set(e,t);for(const n of nn.values())Ls(n,t);for(const n of iu.values())Ls(n,t);return!0}function Vt(t,e){const n=t.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),t.container.getProvider(e)}function su(t){return t==null?!1:t.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ru={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},we=new En("app","Firebase",ru);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ou{constructor(e,n,i){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},n),this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=i,this.container.addComponent(new fe("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw we.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const au=tu;function to(t,e={}){let n=t;typeof e!="object"&&(e={name:e});const i=Object.assign({name:ci,automaticDataCollectionEnabled:!1},e),s=i.name;if(typeof s!="string"||!s)throw we.create("bad-app-name",{appName:String(s)});if(n||(n=Gr()),!n)throw we.create("no-options");const r=nn.get(s);if(r){if(Tt(n,r.options)&&Tt(i,r.config))return r;throw we.create("duplicate-app",{appName:s})}const o=new hc(s);for(const l of ui.values())o.addComponent(l);const a=new ou(n,i,o);return nn.set(s,a),a}function no(t=ci){const e=nn.get(t);if(!e&&t===ci&&Gr())return to();if(!e)throw we.create("no-app",{appName:t});return e}function le(t,e,n){var i;let s=(i=nu[t])!==null&&i!==void 0?i:t;n&&(s+=`-${n}`);const r=s.match(/\s|\//),o=e.match(/\s|\//);if(r||o){const a=[`Unable to register library "${s}" with version "${e}":`];r&&a.push(`library name "${s}" contains illegal characters (whitespace or "/")`),r&&o&&a.push("and"),o&&a.push(`version name "${e}" contains illegal characters (whitespace or "/")`),_e.warn(a.join(" "));return}Se(new fe(`${s}-version`,()=>({library:s,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lu="firebase-heartbeat-database",cu=1,kt="firebase-heartbeat-store";let zn=null;function io(){return zn||(zn=eo(lu,cu,{upgrade:(t,e)=>{switch(e){case 0:try{t.createObjectStore(kt)}catch(n){console.warn(n)}}}}).catch(t=>{throw we.create("idb-open",{originalErrorMessage:t.message})})),zn}async function uu(t){try{const n=(await io()).transaction(kt),i=await n.objectStore(kt).get(so(t));return await n.done,i}catch(e){if(e instanceof ze)_e.warn(e.message);else{const n=we.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});_e.warn(n.message)}}}async function Fs(t,e){try{const i=(await io()).transaction(kt,"readwrite");await i.objectStore(kt).put(e,so(t)),await i.done}catch(n){if(n instanceof ze)_e.warn(n.message);else{const i=we.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});_e.warn(i.message)}}}function so(t){return`${t.name}!${t.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const du=1024,hu=30;class fu{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new pu(n),this._heartbeatsCachePromise=this._storage.read().then(i=>(this._heartbeatsCache=i,i))}async triggerHeartbeat(){var e,n;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),r=Bs();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)===null||n===void 0?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===r||this._heartbeatsCache.heartbeats.some(o=>o.date===r))return;if(this._heartbeatsCache.heartbeats.push({date:r,agent:s}),this._heartbeatsCache.heartbeats.length>hu){const o=gu(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(i){_e.warn(i)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=Bs(),{heartbeatsToSend:i,unsentEntries:s}=_u(this._heartbeatsCache.heartbeats),r=en(JSON.stringify({version:2,heartbeats:i}));return this._heartbeatsCache.lastSentHeartbeatDate=n,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),r}catch(n){return _e.warn(n),""}}}function Bs(){return new Date().toISOString().substring(0,10)}function _u(t,e=du){const n=[];let i=t.slice();for(const s of t){const r=n.find(o=>o.agent===s.agent);if(r){if(r.dates.push(s.date),Vs(n)>e){r.dates.pop();break}}else if(n.push({agent:s.agent,dates:[s.date]}),Vs(n)>e){n.pop();break}i=i.slice(1)}return{heartbeatsToSend:n,unsentEntries:i}}class pu{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Kr()?Qr().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await uu(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var n;if(await this._canUseIndexedDBPromise){const s=await this.read();return Fs(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:s.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var n;if(await this._canUseIndexedDBPromise){const s=await this.read();return Fs(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...e.heartbeats]})}else return}}function Vs(t){return en(JSON.stringify({version:2,heartbeats:t})).length}function gu(t){if(t.length===0)return-1;let e=0,n=t[0].date;for(let i=1;i<t.length;i++)t[i].date<n&&(n=t[i].date,e=i);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mu(t){Se(new fe("platform-logger",e=>new kc(e),"PRIVATE")),Se(new fe("heartbeat",e=>new fu(e),"PRIVATE")),le(li,Ms,t),le(li,Ms,"esm2017"),le("fire-js","")}mu("");var vu="firebase",yu="11.6.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */le(vu,yu,"app");const ro="@firebase/installations",Fi="0.6.13";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oo=1e4,ao=`w:${Fi}`,lo="FIS_v2",Cu="https://firebaseinstallations.googleapis.com/v1",bu=60*60*1e3,wu="installations",Eu="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Iu={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},Fe=new En(wu,Eu,Iu);function co(t){return t instanceof ze&&t.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function uo({projectId:t}){return`${Cu}/projects/${t}/installations`}function ho(t){return{token:t.token,requestStatus:2,expiresIn:Tu(t.expiresIn),creationTime:Date.now()}}async function fo(t,e){const i=(await e.json()).error;return Fe.create("request-failed",{requestName:t,serverCode:i.code,serverMessage:i.message,serverStatus:i.status})}function _o({apiKey:t}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":t})}function Su(t,{refreshToken:e}){const n=_o(t);return n.append("Authorization",ku(e)),n}async function po(t){const e=await t();return e.status>=500&&e.status<600?t():e}function Tu(t){return Number(t.replace("s","000"))}function ku(t){return`${lo} ${t}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Nu({appConfig:t,heartbeatServiceProvider:e},{fid:n}){const i=uo(t),s=_o(t),r=e.getImmediate({optional:!0});if(r){const c=await r.getHeartbeatsHeader();c&&s.append("x-firebase-client",c)}const o={fid:n,authVersion:lo,appId:t.appId,sdkVersion:ao},a={method:"POST",headers:s,body:JSON.stringify(o)},l=await po(()=>fetch(i,a));if(l.ok){const c=await l.json();return{fid:c.fid||n,registrationStatus:2,refreshToken:c.refreshToken,authToken:ho(c.authToken)}}else throw await fo("Create Installation",l)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function go(t){return new Promise(e=>{setTimeout(e,t)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Au(t){return btoa(String.fromCharCode(...t)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ru=/^[cdef][\w-]{21}$/,di="";function Pu(){try{const t=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(t),t[0]=112+t[0]%16;const n=Du(t);return Ru.test(n)?n:di}catch{return di}}function Du(t){return Au(t).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Sn(t){return`${t.appName}!${t.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mo=new Map;function vo(t,e){const n=Sn(t);yo(n,e),xu(n,e)}function yo(t,e){const n=mo.get(t);if(n)for(const i of n)i(e)}function xu(t,e){const n=Ou();n&&n.postMessage({key:t,fid:e}),Mu()}let Oe=null;function Ou(){return!Oe&&"BroadcastChannel"in self&&(Oe=new BroadcastChannel("[Firebase] FID Change"),Oe.onmessage=t=>{yo(t.data.key,t.data.fid)}),Oe}function Mu(){mo.size===0&&Oe&&(Oe.close(),Oe=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lu="firebase-installations-database",Fu=1,Be="firebase-installations-store";let jn=null;function Bi(){return jn||(jn=eo(Lu,Fu,{upgrade:(t,e)=>{switch(e){case 0:t.createObjectStore(Be)}}})),jn}async function sn(t,e){const n=Sn(t),s=(await Bi()).transaction(Be,"readwrite"),r=s.objectStore(Be),o=await r.get(n);return await r.put(e,n),await s.done,(!o||o.fid!==e.fid)&&vo(t,e.fid),e}async function Co(t){const e=Sn(t),i=(await Bi()).transaction(Be,"readwrite");await i.objectStore(Be).delete(e),await i.done}async function Tn(t,e){const n=Sn(t),s=(await Bi()).transaction(Be,"readwrite"),r=s.objectStore(Be),o=await r.get(n),a=e(o);return a===void 0?await r.delete(n):await r.put(a,n),await s.done,a&&(!o||o.fid!==a.fid)&&vo(t,a.fid),a}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Vi(t){let e;const n=await Tn(t.appConfig,i=>{const s=Bu(i),r=Vu(t,s);return e=r.registrationPromise,r.installationEntry});return n.fid===di?{installationEntry:await e}:{installationEntry:n,registrationPromise:e}}function Bu(t){const e=t||{fid:Pu(),registrationStatus:0};return bo(e)}function Vu(t,e){if(e.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(Fe.create("app-offline"));return{installationEntry:e,registrationPromise:s}}const n={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},i=$u(t,n);return{installationEntry:n,registrationPromise:i}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:Wu(t)}:{installationEntry:e}}async function $u(t,e){try{const n=await Nu(t,e);return sn(t.appConfig,n)}catch(n){throw co(n)&&n.customData.serverCode===409?await Co(t.appConfig):await sn(t.appConfig,{fid:e.fid,registrationStatus:0}),n}}async function Wu(t){let e=await $s(t.appConfig);for(;e.registrationStatus===1;)await go(100),e=await $s(t.appConfig);if(e.registrationStatus===0){const{installationEntry:n,registrationPromise:i}=await Vi(t);return i||n}return e}function $s(t){return Tn(t,e=>{if(!e)throw Fe.create("installation-not-found");return bo(e)})}function bo(t){return Uu(t)?{fid:t.fid,registrationStatus:0}:t}function Uu(t){return t.registrationStatus===1&&t.registrationTime+oo<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Hu({appConfig:t,heartbeatServiceProvider:e},n){const i=zu(t,n),s=Su(t,n),r=e.getImmediate({optional:!0});if(r){const c=await r.getHeartbeatsHeader();c&&s.append("x-firebase-client",c)}const o={installation:{sdkVersion:ao,appId:t.appId}},a={method:"POST",headers:s,body:JSON.stringify(o)},l=await po(()=>fetch(i,a));if(l.ok){const c=await l.json();return ho(c)}else throw await fo("Generate Auth Token",l)}function zu(t,{fid:e}){return`${uo(t)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function $i(t,e=!1){let n;const i=await Tn(t.appConfig,r=>{if(!wo(r))throw Fe.create("not-registered");const o=r.authToken;if(!e&&Gu(o))return r;if(o.requestStatus===1)return n=ju(t,e),r;{if(!navigator.onLine)throw Fe.create("app-offline");const a=Ku(r);return n=qu(t,a),a}});return n?await n:i.authToken}async function ju(t,e){let n=await Ws(t.appConfig);for(;n.authToken.requestStatus===1;)await go(100),n=await Ws(t.appConfig);const i=n.authToken;return i.requestStatus===0?$i(t,e):i}function Ws(t){return Tn(t,e=>{if(!wo(e))throw Fe.create("not-registered");const n=e.authToken;return Qu(n)?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e})}async function qu(t,e){try{const n=await Hu(t,e),i=Object.assign(Object.assign({},e),{authToken:n});return await sn(t.appConfig,i),n}catch(n){if(co(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await Co(t.appConfig);else{const i=Object.assign(Object.assign({},e),{authToken:{requestStatus:0}});await sn(t.appConfig,i)}throw n}}function wo(t){return t!==void 0&&t.registrationStatus===2}function Gu(t){return t.requestStatus===2&&!Yu(t)}function Yu(t){const e=Date.now();return e<t.creationTime||t.creationTime+t.expiresIn<e+bu}function Ku(t){const e={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},t),{authToken:e})}function Qu(t){return t.requestStatus===1&&t.requestTime+oo<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Xu(t){const e=t,{installationEntry:n,registrationPromise:i}=await Vi(e);return i?i.catch(console.error):$i(e).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ju(t,e=!1){const n=t;return await Zu(n),(await $i(n,e)).token}async function Zu(t){const{registrationPromise:e}=await Vi(t);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ed(t){if(!t||!t.options)throw qn("App Configuration");if(!t.name)throw qn("App Name");const e=["projectId","apiKey","appId"];for(const n of e)if(!t.options[n])throw qn(n);return{appName:t.name,projectId:t.options.projectId,apiKey:t.options.apiKey,appId:t.options.appId}}function qn(t){return Fe.create("missing-app-config-values",{valueName:t})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Eo="installations",td="installations-internal",nd=t=>{const e=t.getProvider("app").getImmediate(),n=ed(e),i=Vt(e,"heartbeat");return{app:e,appConfig:n,heartbeatServiceProvider:i,_delete:()=>Promise.resolve()}},id=t=>{const e=t.getProvider("app").getImmediate(),n=Vt(e,Eo).getImmediate();return{getId:()=>Xu(n),getToken:s=>Ju(n,s)}};function sd(){Se(new fe(Eo,nd,"PUBLIC")),Se(new fe(td,id,"PRIVATE"))}sd();le(ro,Fi);le(ro,Fi,"esm2017");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const rn="analytics",rd="firebase_id",od="origin",ad=60*1e3,ld="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",Wi="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Y=new Mi("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cd={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},Q=new En("analytics","Analytics",cd);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ud(t){if(!t.startsWith(Wi)){const e=Q.create("invalid-gtag-resource",{gtagURL:t});return Y.warn(e.message),""}return t}function Io(t){return Promise.all(t.map(e=>e.catch(n=>n)))}function dd(t,e){let n;return window.trustedTypes&&(n=window.trustedTypes.createPolicy(t,e)),n}function hd(t,e){const n=dd("firebase-js-sdk-policy",{createScriptURL:ud}),i=document.createElement("script"),s=`${Wi}?l=${t}&id=${e}`;i.src=n?n==null?void 0:n.createScriptURL(s):s,i.async=!0,document.head.appendChild(i)}function fd(t){let e=[];return Array.isArray(window[t])?e=window[t]:window[t]=e,e}async function _d(t,e,n,i,s,r){const o=i[s];try{if(o)await e[o];else{const l=(await Io(n)).find(c=>c.measurementId===s);l&&await e[l.appId]}}catch(a){Y.error(a)}t("config",s,r)}async function pd(t,e,n,i,s){try{let r=[];if(s&&s.send_to){let o=s.send_to;Array.isArray(o)||(o=[o]);const a=await Io(n);for(const l of o){const c=a.find(d=>d.measurementId===l),u=c&&e[c.appId];if(u)r.push(u);else{r=[];break}}}r.length===0&&(r=Object.values(e)),await Promise.all(r),t("event",i,s||{})}catch(r){Y.error(r)}}function gd(t,e,n,i){async function s(r,...o){try{if(r==="event"){const[a,l]=o;await pd(t,e,n,a,l)}else if(r==="config"){const[a,l]=o;await _d(t,e,n,i,a,l)}else if(r==="consent"){const[a,l]=o;t("consent",a,l)}else if(r==="get"){const[a,l,c]=o;t("get",a,l,c)}else if(r==="set"){const[a]=o;t("set",a)}else t(r,...o)}catch(a){Y.error(a)}}return s}function md(t,e,n,i,s){let r=function(...o){window[i].push(arguments)};return window[s]&&typeof window[s]=="function"&&(r=window[s]),window[s]=gd(r,t,e,n),{gtagCore:r,wrappedGtag:window[s]}}function vd(t){const e=window.document.getElementsByTagName("script");for(const n of Object.values(e))if(n.src&&n.src.includes(Wi)&&n.src.includes(t))return n;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yd=30,Cd=1e3;class bd{constructor(e={},n=Cd){this.throttleMetadata=e,this.intervalMillis=n}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,n){this.throttleMetadata[e]=n}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}}const So=new bd;function wd(t){return new Headers({Accept:"application/json","x-goog-api-key":t})}async function Ed(t){var e;const{appId:n,apiKey:i}=t,s={method:"GET",headers:wd(i)},r=ld.replace("{app-id}",n),o=await fetch(r,s);if(o.status!==200&&o.status!==304){let a="";try{const l=await o.json();!((e=l.error)===null||e===void 0)&&e.message&&(a=l.error.message)}catch{}throw Q.create("config-fetch-failed",{httpStatus:o.status,responseMessage:a})}return o.json()}async function Id(t,e=So,n){const{appId:i,apiKey:s,measurementId:r}=t.options;if(!i)throw Q.create("no-app-id");if(!s){if(r)return{measurementId:r,appId:i};throw Q.create("no-api-key")}const o=e.getThrottleMetadata(i)||{backoffCount:0,throttleEndTimeMillis:Date.now()},a=new kd;return setTimeout(async()=>{a.abort()},ad),To({appId:i,apiKey:s,measurementId:r},o,a,e)}async function To(t,{throttleEndTimeMillis:e,backoffCount:n},i,s=So){var r;const{appId:o,measurementId:a}=t;try{await Sd(i,e)}catch(l){if(a)return Y.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${a} provided in the "measurementId" field in the local Firebase config. [${l==null?void 0:l.message}]`),{appId:o,measurementId:a};throw l}try{const l=await Ed(t);return s.deleteThrottleMetadata(o),l}catch(l){const c=l;if(!Td(c)){if(s.deleteThrottleMetadata(o),a)return Y.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${a} provided in the "measurementId" field in the local Firebase config. [${c==null?void 0:c.message}]`),{appId:o,measurementId:a};throw l}const u=Number((r=c==null?void 0:c.customData)===null||r===void 0?void 0:r.httpStatus)===503?Ps(n,s.intervalMillis,yd):Ps(n,s.intervalMillis),d={throttleEndTimeMillis:Date.now()+u,backoffCount:n+1};return s.setThrottleMetadata(o,d),Y.debug(`Calling attemptFetch again in ${u} millis`),To(t,d,i,s)}}function Sd(t,e){return new Promise((n,i)=>{const s=Math.max(e-Date.now(),0),r=setTimeout(n,s);t.addEventListener(()=>{clearTimeout(r),i(Q.create("fetch-throttle",{throttleEndTimeMillis:e}))})})}function Td(t){if(!(t instanceof ze)||!t.customData)return!1;const e=Number(t.customData.httpStatus);return e===429||e===500||e===503||e===504}class kd{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}async function Nd(t,e,n,i,s){if(s&&s.global){t("event",n,i);return}else{const r=await e,o=Object.assign(Object.assign({},i),{send_to:r});t("event",n,o)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ad(){if(Kr())try{await Qr()}catch(t){return Y.warn(Q.create("indexeddb-unavailable",{errorInfo:t==null?void 0:t.toString()}).message),!1}else return Y.warn(Q.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function Rd(t,e,n,i,s,r,o){var a;const l=Id(t);l.then(f=>{n[f.measurementId]=f.appId,t.options.measurementId&&f.measurementId!==t.options.measurementId&&Y.warn(`The measurement ID in the local Firebase config (${t.options.measurementId}) does not match the measurement ID fetched from the server (${f.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(f=>Y.error(f)),e.push(l);const c=Ad().then(f=>{if(f)return i.getId()}),[u,d]=await Promise.all([l,c]);vd(r)||hd(r,u.measurementId),s("js",new Date);const h=(a=o==null?void 0:o.config)!==null&&a!==void 0?a:{};return h[od]="firebase",h.update=!0,d!=null&&(h[rd]=d),s("config",u.measurementId,h),u.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pd{constructor(e){this.app=e}_delete(){return delete vt[this.app.options.appId],Promise.resolve()}}let vt={},Us=[];const Hs={};let Gn="dataLayer",Dd="gtag",zs,ko,js=!1;function xd(){const t=[];if(Gl()&&t.push("This is a browser extension environment."),Ql()||t.push("Cookies are not available."),t.length>0){const e=t.map((i,s)=>`(${s+1}) ${i}`).join(" "),n=Q.create("invalid-analytics-context",{errorInfo:e});Y.warn(n.message)}}function Od(t,e,n){xd();const i=t.options.appId;if(!i)throw Q.create("no-app-id");if(!t.options.apiKey)if(t.options.measurementId)Y.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${t.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw Q.create("no-api-key");if(vt[i]!=null)throw Q.create("already-exists",{id:i});if(!js){fd(Gn);const{wrappedGtag:r,gtagCore:o}=md(vt,Us,Hs,Gn,Dd);ko=r,zs=o,js=!0}return vt[i]=Rd(t,Us,Hs,e,zs,Gn,n),new Pd(t)}function Md(t=no()){t=ue(t);const e=Vt(t,rn);return e.isInitialized()?e.getImmediate():Ld(t)}function Ld(t,e={}){const n=Vt(t,rn);if(n.isInitialized()){const s=n.getImmediate();if(Tt(e,n.getOptions()))return s;throw Q.create("already-initialized")}return n.initialize({options:e})}function Fd(t,e,n,i){t=ue(t),Nd(ko,vt[t.app.options.appId],e,n,i).catch(s=>Y.error(s))}const qs="@firebase/analytics",Gs="0.10.12";function Bd(){Se(new fe(rn,(e,{options:n})=>{const i=e.getProvider("app").getImmediate(),s=e.getProvider("installations-internal").getImmediate();return Od(i,s,n)},"PUBLIC")),Se(new fe("analytics-internal",t,"PRIVATE")),le(qs,Gs),le(qs,Gs,"esm2017");function t(e){try{const n=e.getProvider(rn).getImmediate();return{logEvent:(i,s,r)=>Fd(n,i,s,r)}}catch(n){throw Q.create("interop-component-reg-failed",{reason:n})}}}Bd();var Ys={};const Ks="@firebase/database",Qs="1.0.14";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let No="";function Vd(t){No=t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $d{constructor(e){this.domStorage_=e,this.prefix_="firebase:"}set(e,n){n==null?this.domStorage_.removeItem(this.prefixedName_(e)):this.domStorage_.setItem(this.prefixedName_(e),O(n))}get(e){const n=this.domStorage_.getItem(this.prefixedName_(e));return n==null?null:St(n)}remove(e){this.domStorage_.removeItem(this.prefixedName_(e))}prefixedName_(e){return this.prefix_+e}toString(){return this.domStorage_.toString()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wd{constructor(){this.cache_={},this.isInMemoryStorage=!0}set(e,n){n==null?delete this.cache_[e]:this.cache_[e]=n}get(e){return ce(this.cache_,e)?this.cache_[e]:null}remove(e){delete this.cache_[e]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ao=function(t){try{if(typeof window<"u"&&typeof window[t]<"u"){const e=window[t];return e.setItem("firebase:sentinel","cache"),e.removeItem("firebase:sentinel"),new $d(e)}}catch{}return new Wd},Me=Ao("localStorage"),Ud=Ao("sessionStorage");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xe=new Mi("@firebase/database"),Hd=function(){let t=1;return function(){return t++}}(),Ro=function(t){const e=sc(t),n=new ic;n.update(e);const i=n.digest();return Oi.encodeByteArray(i)},$t=function(...t){let e="";for(let n=0;n<t.length;n++){const i=t[n];Array.isArray(i)||i&&typeof i=="object"&&typeof i.length=="number"?e+=$t.apply(null,i):typeof i=="object"?e+=O(i):e+=i,e+=" "}return e};let yt=null,Xs=!0;const zd=function(t,e){_(!0,"Can't turn on custom loggers persistently."),Xe.logLevel=N.VERBOSE,yt=Xe.log.bind(Xe)},F=function(...t){if(Xs===!0&&(Xs=!1,yt===null&&Ud.get("logging_enabled")===!0&&zd()),yt){const e=$t.apply(null,t);yt(e)}},Wt=function(t){return function(...e){F(t,...e)}},hi=function(...t){const e="FIREBASE INTERNAL ERROR: "+$t(...t);Xe.error(e)},pe=function(...t){const e=`FIREBASE FATAL ERROR: ${$t(...t)}`;throw Xe.error(e),new Error(e)},z=function(...t){const e="FIREBASE WARNING: "+$t(...t);Xe.warn(e)},jd=function(){typeof window<"u"&&window.location&&window.location.protocol&&window.location.protocol.indexOf("https:")!==-1&&z("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().")},kn=function(t){return typeof t=="number"&&(t!==t||t===Number.POSITIVE_INFINITY||t===Number.NEGATIVE_INFINITY)},qd=function(t){if(document.readyState==="complete")t();else{let e=!1;const n=function(){if(!document.body){setTimeout(n,Math.floor(10));return}e||(e=!0,t())};document.addEventListener?(document.addEventListener("DOMContentLoaded",n,!1),window.addEventListener("load",n,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",()=>{document.readyState==="complete"&&n()}),window.attachEvent("onload",n))}},nt="[MIN_NAME]",Ve="[MAX_NAME]",je=function(t,e){if(t===e)return 0;if(t===nt||e===Ve)return-1;if(e===nt||t===Ve)return 1;{const n=Js(t),i=Js(e);return n!==null?i!==null?n-i===0?t.length-e.length:n-i:-1:i!==null?1:t<e?-1:1}},Gd=function(t,e){return t===e?0:t<e?-1:1},_t=function(t,e){if(e&&t in e)return e[t];throw new Error("Missing required key ("+t+") in object: "+O(e))},Ui=function(t){if(typeof t!="object"||t===null)return O(t);const e=[];for(const i in t)e.push(i);e.sort();let n="{";for(let i=0;i<e.length;i++)i!==0&&(n+=","),n+=O(e[i]),n+=":",n+=Ui(t[e[i]]);return n+="}",n},Po=function(t,e){const n=t.length;if(n<=e)return[t];const i=[];for(let s=0;s<n;s+=e)s+e>n?i.push(t.substring(s,n)):i.push(t.substring(s,s+e));return i};function B(t,e){for(const n in t)t.hasOwnProperty(n)&&e(n,t[n])}const Do=function(t){_(!kn(t),"Invalid JSON number");const e=11,n=52,i=(1<<e-1)-1;let s,r,o,a,l;t===0?(r=0,o=0,s=1/t===-1/0?1:0):(s=t<0,t=Math.abs(t),t>=Math.pow(2,1-i)?(a=Math.min(Math.floor(Math.log(t)/Math.LN2),i),r=a+i,o=Math.round(t*Math.pow(2,n-a)-Math.pow(2,n))):(r=0,o=Math.round(t/Math.pow(2,1-i-n))));const c=[];for(l=n;l;l-=1)c.push(o%2?1:0),o=Math.floor(o/2);for(l=e;l;l-=1)c.push(r%2?1:0),r=Math.floor(r/2);c.push(s?1:0),c.reverse();const u=c.join("");let d="";for(l=0;l<64;l+=8){let h=parseInt(u.substr(l,8),2).toString(16);h.length===1&&(h="0"+h),d=d+h}return d.toLowerCase()},Yd=function(){return!!(typeof window=="object"&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))},Kd=function(){return typeof Windows=="object"&&typeof Windows.UI=="object"};function Qd(t,e){let n="Unknown Error";t==="too_big"?n="The data requested exceeds the maximum size that can be accessed with a single request.":t==="permission_denied"?n="Client doesn't have permission to access the desired data.":t==="unavailable"&&(n="The service is unavailable");const i=new Error(t+" at "+e._path.toString()+": "+n);return i.code=t.toUpperCase(),i}const Xd=new RegExp("^-?(0*)\\d{1,10}$"),Jd=-2147483648,Zd=2147483647,Js=function(t){if(Xd.test(t)){const e=Number(t);if(e>=Jd&&e<=Zd)return e}return null},lt=function(t){try{t()}catch(e){setTimeout(()=>{const n=e.stack||"";throw z("Exception was thrown by user callback.",n),e},Math.floor(0))}},eh=function(){return(typeof window=="object"&&window.navigator&&window.navigator.userAgent||"").search(/googlebot|google webmaster tools|bingbot|yahoo! slurp|baiduspider|yandexbot|duckduckbot/i)>=0},Ct=function(t,e){const n=setTimeout(t,e);return typeof n=="number"&&typeof Deno<"u"&&Deno.unrefTimer?Deno.unrefTimer(n):typeof n=="object"&&n.unref&&n.unref(),n};/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class th{constructor(e,n){this.appCheckProvider=n,this.appName=e.name,su(e)&&e.settings.appCheckToken&&(this.serverAppAppCheckToken=e.settings.appCheckToken),this.appCheck=n==null?void 0:n.getImmediate({optional:!0}),this.appCheck||n==null||n.get().then(i=>this.appCheck=i)}getToken(e){if(this.serverAppAppCheckToken){if(e)throw new Error("Attempted reuse of `FirebaseServerApp.appCheckToken` after previous usage failed.");return Promise.resolve({token:this.serverAppAppCheckToken})}return this.appCheck?this.appCheck.getToken(e):new Promise((n,i)=>{setTimeout(()=>{this.appCheck?this.getToken(e).then(n,i):n(null)},0)})}addTokenChangeListener(e){var n;(n=this.appCheckProvider)===null||n===void 0||n.get().then(i=>i.addTokenListener(e))}notifyForInvalidToken(){z(`Provided AppCheck credentials for the app named "${this.appName}" are invalid. This usually indicates your app was not initialized correctly.`)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nh{constructor(e,n,i){this.appName_=e,this.firebaseOptions_=n,this.authProvider_=i,this.auth_=null,this.auth_=i.getImmediate({optional:!0}),this.auth_||i.onInit(s=>this.auth_=s)}getToken(e){return this.auth_?this.auth_.getToken(e).catch(n=>n&&n.code==="auth/token-not-initialized"?(F("Got auth/token-not-initialized error.  Treating as null token."),null):Promise.reject(n)):new Promise((n,i)=>{setTimeout(()=>{this.auth_?this.getToken(e).then(n,i):n(null)},0)})}addTokenChangeListener(e){this.auth_?this.auth_.addAuthTokenListener(e):this.authProvider_.get().then(n=>n.addAuthTokenListener(e))}removeTokenChangeListener(e){this.authProvider_.get().then(n=>n.removeAuthTokenListener(e))}notifyForInvalidToken(){let e='Provided authentication credentials for the app named "'+this.appName_+'" are invalid. This usually indicates your app was not initialized correctly. ';"credential"in this.firebaseOptions_?e+='Make sure the "credential" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':"serviceAccount"in this.firebaseOptions_?e+='Make sure the "serviceAccount" property provided to initializeApp() is authorized to access the specified "databaseURL" and is from the correct project.':e+='Make sure the "apiKey" and "databaseURL" properties provided to initializeApp() match the values provided for your app at https://console.firebase.google.com/.',z(e)}}class Xt{constructor(e){this.accessToken=e}getToken(e){return Promise.resolve({accessToken:this.accessToken})}addTokenChangeListener(e){e(this.accessToken)}removeTokenChangeListener(e){}notifyForInvalidToken(){}}Xt.OWNER="owner";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hi="5",xo="v",Oo="s",Mo="r",Lo="f",Fo=/(console\.firebase|firebase-console-\w+\.corp|firebase\.corp)\.google\.com/,Bo="ls",Vo="p",fi="ac",$o="websocket",Wo="long_polling";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Uo{constructor(e,n,i,s,r=!1,o="",a=!1,l=!1,c=null){this.secure=n,this.namespace=i,this.webSocketOnly=s,this.nodeAdmin=r,this.persistenceKey=o,this.includeNamespaceInQueryParams=a,this.isUsingEmulator=l,this.emulatorOptions=c,this._host=e.toLowerCase(),this._domain=this._host.substr(this._host.indexOf(".")+1),this.internalHost=Me.get("host:"+e)||this._host}isCacheableHost(){return this.internalHost.substr(0,2)==="s-"}isCustomHost(){return this._domain!=="firebaseio.com"&&this._domain!=="firebaseio-demo.com"}get host(){return this._host}set host(e){e!==this.internalHost&&(this.internalHost=e,this.isCacheableHost()&&Me.set("host:"+this._host,this.internalHost))}toString(){let e=this.toURLString();return this.persistenceKey&&(e+="<"+this.persistenceKey+">"),e}toURLString(){const e=this.secure?"https://":"http://",n=this.includeNamespaceInQueryParams?`?ns=${this.namespace}`:"";return`${e}${this.host}/${n}`}}function ih(t){return t.host!==t.internalHost||t.isCustomHost()||t.includeNamespaceInQueryParams}function Ho(t,e,n){_(typeof e=="string","typeof type must == string"),_(typeof n=="object","typeof params must == object");let i;if(e===$o)i=(t.secure?"wss://":"ws://")+t.internalHost+"/.ws?";else if(e===Wo)i=(t.secure?"https://":"http://")+t.internalHost+"/.lp?";else throw new Error("Unknown connection type: "+e);ih(t)&&(n.ns=t.namespace);const s=[];return B(n,(r,o)=>{s.push(r+"="+o)}),i+s.join("&")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sh{constructor(){this.counters_={}}incrementCounter(e,n=1){ce(this.counters_,e)||(this.counters_[e]=0),this.counters_[e]+=n}get(){return Fl(this.counters_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yn={},Kn={};function zi(t){const e=t.toString();return Yn[e]||(Yn[e]=new sh),Yn[e]}function rh(t,e){const n=t.toString();return Kn[n]||(Kn[n]=e()),Kn[n]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oh{constructor(e){this.onMessage_=e,this.pendingResponses=[],this.currentResponseNum=0,this.closeAfterResponse=-1,this.onClose=null}closeAfter(e,n){this.closeAfterResponse=e,this.onClose=n,this.closeAfterResponse<this.currentResponseNum&&(this.onClose(),this.onClose=null)}handleResponse(e,n){for(this.pendingResponses[e]=n;this.pendingResponses[this.currentResponseNum];){const i=this.pendingResponses[this.currentResponseNum];delete this.pendingResponses[this.currentResponseNum];for(let s=0;s<i.length;++s)i[s]&&lt(()=>{this.onMessage_(i[s])});if(this.currentResponseNum===this.closeAfterResponse){this.onClose&&(this.onClose(),this.onClose=null);break}this.currentResponseNum++}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zs="start",ah="close",lh="pLPCommand",ch="pRTLPCB",zo="id",jo="pw",qo="ser",uh="cb",dh="seg",hh="ts",fh="d",_h="dframe",Go=1870,Yo=30,ph=Go-Yo,gh=25e3,mh=3e4;class Qe{constructor(e,n,i,s,r,o,a){this.connId=e,this.repoInfo=n,this.applicationId=i,this.appCheckToken=s,this.authToken=r,this.transportSessionId=o,this.lastSessionId=a,this.bytesSent=0,this.bytesReceived=0,this.everConnected_=!1,this.log_=Wt(e),this.stats_=zi(n),this.urlFn=l=>(this.appCheckToken&&(l[fi]=this.appCheckToken),Ho(n,Wo,l))}open(e,n){this.curSegmentNum=0,this.onDisconnect_=n,this.myPacketOrderer=new oh(e),this.isClosed_=!1,this.connectTimeoutTimer_=setTimeout(()=>{this.log_("Timed out trying to connect."),this.onClosed_(),this.connectTimeoutTimer_=null},Math.floor(mh)),qd(()=>{if(this.isClosed_)return;this.scriptTagHolder=new ji((...r)=>{const[o,a,l,c,u]=r;if(this.incrementIncomingBytes_(r),!!this.scriptTagHolder)if(this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null),this.everConnected_=!0,o===Zs)this.id=a,this.password=l;else if(o===ah)a?(this.scriptTagHolder.sendNewPolls=!1,this.myPacketOrderer.closeAfter(a,()=>{this.onClosed_()})):this.onClosed_();else throw new Error("Unrecognized command received: "+o)},(...r)=>{const[o,a]=r;this.incrementIncomingBytes_(r),this.myPacketOrderer.handleResponse(o,a)},()=>{this.onClosed_()},this.urlFn);const i={};i[Zs]="t",i[qo]=Math.floor(Math.random()*1e8),this.scriptTagHolder.uniqueCallbackIdentifier&&(i[uh]=this.scriptTagHolder.uniqueCallbackIdentifier),i[xo]=Hi,this.transportSessionId&&(i[Oo]=this.transportSessionId),this.lastSessionId&&(i[Bo]=this.lastSessionId),this.applicationId&&(i[Vo]=this.applicationId),this.appCheckToken&&(i[fi]=this.appCheckToken),typeof location<"u"&&location.hostname&&Fo.test(location.hostname)&&(i[Mo]=Lo);const s=this.urlFn(i);this.log_("Connecting via long-poll to "+s),this.scriptTagHolder.addTag(s,()=>{})})}start(){this.scriptTagHolder.startLongPoll(this.id,this.password),this.addDisconnectPingFrame(this.id,this.password)}static forceAllow(){Qe.forceAllow_=!0}static forceDisallow(){Qe.forceDisallow_=!0}static isAvailable(){return Qe.forceAllow_?!0:!Qe.forceDisallow_&&typeof document<"u"&&document.createElement!=null&&!Yd()&&!Kd()}markConnectionHealthy(){}shutdown_(){this.isClosed_=!0,this.scriptTagHolder&&(this.scriptTagHolder.close(),this.scriptTagHolder=null),this.myDisconnFrame&&(document.body.removeChild(this.myDisconnFrame),this.myDisconnFrame=null),this.connectTimeoutTimer_&&(clearTimeout(this.connectTimeoutTimer_),this.connectTimeoutTimer_=null)}onClosed_(){this.isClosed_||(this.log_("Longpoll is closing itself"),this.shutdown_(),this.onDisconnect_&&(this.onDisconnect_(this.everConnected_),this.onDisconnect_=null))}close(){this.isClosed_||(this.log_("Longpoll is being closed."),this.shutdown_())}send(e){const n=O(e);this.bytesSent+=n.length,this.stats_.incrementCounter("bytes_sent",n.length);const i=zr(n),s=Po(i,ph);for(let r=0;r<s.length;r++)this.scriptTagHolder.enqueueSegment(this.curSegmentNum,s.length,s[r]),this.curSegmentNum++}addDisconnectPingFrame(e,n){this.myDisconnFrame=document.createElement("iframe");const i={};i[_h]="t",i[zo]=e,i[jo]=n,this.myDisconnFrame.src=this.urlFn(i),this.myDisconnFrame.style.display="none",document.body.appendChild(this.myDisconnFrame)}incrementIncomingBytes_(e){const n=O(e).length;this.bytesReceived+=n,this.stats_.incrementCounter("bytes_received",n)}}class ji{constructor(e,n,i,s){this.onDisconnect=i,this.urlFn=s,this.outstandingRequests=new Set,this.pendingSegs=[],this.currentSerial=Math.floor(Math.random()*1e8),this.sendNewPolls=!0;{this.uniqueCallbackIdentifier=Hd(),window[lh+this.uniqueCallbackIdentifier]=e,window[ch+this.uniqueCallbackIdentifier]=n,this.myIFrame=ji.createIFrame_();let r="";this.myIFrame.src&&this.myIFrame.src.substr(0,11)==="javascript:"&&(r='<script>document.domain="'+document.domain+'";<\/script>');const o="<html><body>"+r+"</body></html>";try{this.myIFrame.doc.open(),this.myIFrame.doc.write(o),this.myIFrame.doc.close()}catch(a){F("frame writing exception"),a.stack&&F(a.stack),F(a)}}}static createIFrame_(){const e=document.createElement("iframe");if(e.style.display="none",document.body){document.body.appendChild(e);try{e.contentWindow.document||F("No IE domain setting required")}catch{const i=document.domain;e.src="javascript:void((function(){document.open();document.domain='"+i+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";return e.contentDocument?e.doc=e.contentDocument:e.contentWindow?e.doc=e.contentWindow.document:e.document&&(e.doc=e.document),e}close(){this.alive=!1,this.myIFrame&&(this.myIFrame.doc.body.textContent="",setTimeout(()=>{this.myIFrame!==null&&(document.body.removeChild(this.myIFrame),this.myIFrame=null)},Math.floor(0)));const e=this.onDisconnect;e&&(this.onDisconnect=null,e())}startLongPoll(e,n){for(this.myID=e,this.myPW=n,this.alive=!0;this.newRequest_(););}newRequest_(){if(this.alive&&this.sendNewPolls&&this.outstandingRequests.size<(this.pendingSegs.length>0?2:1)){this.currentSerial++;const e={};e[zo]=this.myID,e[jo]=this.myPW,e[qo]=this.currentSerial;let n=this.urlFn(e),i="",s=0;for(;this.pendingSegs.length>0&&this.pendingSegs[0].d.length+Yo+i.length<=Go;){const o=this.pendingSegs.shift();i=i+"&"+dh+s+"="+o.seg+"&"+hh+s+"="+o.ts+"&"+fh+s+"="+o.d,s++}return n=n+i,this.addLongPollTag_(n,this.currentSerial),!0}else return!1}enqueueSegment(e,n,i){this.pendingSegs.push({seg:e,ts:n,d:i}),this.alive&&this.newRequest_()}addLongPollTag_(e,n){this.outstandingRequests.add(n);const i=()=>{this.outstandingRequests.delete(n),this.newRequest_()},s=setTimeout(i,Math.floor(gh)),r=()=>{clearTimeout(s),i()};this.addTag(e,r)}addTag(e,n){setTimeout(()=>{try{if(!this.sendNewPolls)return;const i=this.myIFrame.doc.createElement("script");i.type="text/javascript",i.async=!0,i.src=e,i.onload=i.onreadystatechange=function(){const s=i.readyState;(!s||s==="loaded"||s==="complete")&&(i.onload=i.onreadystatechange=null,i.parentNode&&i.parentNode.removeChild(i),n())},i.onerror=()=>{F("Long-poll script failed to load: "+e),this.sendNewPolls=!1,this.close()},this.myIFrame.doc.body.appendChild(i)}catch{}},Math.floor(1))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vh=16384,yh=45e3;let on=null;typeof MozWebSocket<"u"?on=MozWebSocket:typeof WebSocket<"u"&&(on=WebSocket);class ne{constructor(e,n,i,s,r,o,a){this.connId=e,this.applicationId=i,this.appCheckToken=s,this.authToken=r,this.keepaliveTimer=null,this.frames=null,this.totalFrames=0,this.bytesSent=0,this.bytesReceived=0,this.log_=Wt(this.connId),this.stats_=zi(n),this.connURL=ne.connectionURL_(n,o,a,s,i),this.nodeAdmin=n.nodeAdmin}static connectionURL_(e,n,i,s,r){const o={};return o[xo]=Hi,typeof location<"u"&&location.hostname&&Fo.test(location.hostname)&&(o[Mo]=Lo),n&&(o[Oo]=n),i&&(o[Bo]=i),s&&(o[fi]=s),r&&(o[Vo]=r),Ho(e,$o,o)}open(e,n){this.onDisconnect=n,this.onMessage=e,this.log_("Websocket connecting to "+this.connURL),this.everConnected_=!1,Me.set("previous_websocket_failure",!0);try{let i;Kl(),this.mySock=new on(this.connURL,[],i)}catch(i){this.log_("Error instantiating WebSocket.");const s=i.message||i.data;s&&this.log_(s),this.onClosed_();return}this.mySock.onopen=()=>{this.log_("Websocket connected."),this.everConnected_=!0},this.mySock.onclose=()=>{this.log_("Websocket connection was disconnected."),this.mySock=null,this.onClosed_()},this.mySock.onmessage=i=>{this.handleIncomingFrame(i)},this.mySock.onerror=i=>{this.log_("WebSocket error.  Closing connection.");const s=i.message||i.data;s&&this.log_(s),this.onClosed_()}}start(){}static forceDisallow(){ne.forceDisallow_=!0}static isAvailable(){let e=!1;if(typeof navigator<"u"&&navigator.userAgent){const n=/Android ([0-9]{0,}\.[0-9]{0,})/,i=navigator.userAgent.match(n);i&&i.length>1&&parseFloat(i[1])<4.4&&(e=!0)}return!e&&on!==null&&!ne.forceDisallow_}static previouslyFailed(){return Me.isInMemoryStorage||Me.get("previous_websocket_failure")===!0}markConnectionHealthy(){Me.remove("previous_websocket_failure")}appendFrame_(e){if(this.frames.push(e),this.frames.length===this.totalFrames){const n=this.frames.join("");this.frames=null;const i=St(n);this.onMessage(i)}}handleNewFrameCount_(e){this.totalFrames=e,this.frames=[]}extractFrameCount_(e){if(_(this.frames===null,"We already have a frame buffer"),e.length<=6){const n=Number(e);if(!isNaN(n))return this.handleNewFrameCount_(n),null}return this.handleNewFrameCount_(1),e}handleIncomingFrame(e){if(this.mySock===null)return;const n=e.data;if(this.bytesReceived+=n.length,this.stats_.incrementCounter("bytes_received",n.length),this.resetKeepAlive(),this.frames!==null)this.appendFrame_(n);else{const i=this.extractFrameCount_(n);i!==null&&this.appendFrame_(i)}}send(e){this.resetKeepAlive();const n=O(e);this.bytesSent+=n.length,this.stats_.incrementCounter("bytes_sent",n.length);const i=Po(n,vh);i.length>1&&this.sendString_(String(i.length));for(let s=0;s<i.length;s++)this.sendString_(i[s])}shutdown_(){this.isClosed_=!0,this.keepaliveTimer&&(clearInterval(this.keepaliveTimer),this.keepaliveTimer=null),this.mySock&&(this.mySock.close(),this.mySock=null)}onClosed_(){this.isClosed_||(this.log_("WebSocket is closing itself"),this.shutdown_(),this.onDisconnect&&(this.onDisconnect(this.everConnected_),this.onDisconnect=null))}close(){this.isClosed_||(this.log_("WebSocket is being closed"),this.shutdown_())}resetKeepAlive(){clearInterval(this.keepaliveTimer),this.keepaliveTimer=setInterval(()=>{this.mySock&&this.sendString_("0"),this.resetKeepAlive()},Math.floor(yh))}sendString_(e){try{this.mySock.send(e)}catch(n){this.log_("Exception thrown from WebSocket.send():",n.message||n.data,"Closing connection."),setTimeout(this.onClosed_.bind(this),0)}}}ne.responsesRequiredToBeHealthy=2;ne.healthyTimeout=3e4;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nt{static get ALL_TRANSPORTS(){return[Qe,ne]}static get IS_TRANSPORT_INITIALIZED(){return this.globalTransportInitialized_}constructor(e){this.initTransports_(e)}initTransports_(e){const n=ne&&ne.isAvailable();let i=n&&!ne.previouslyFailed();if(e.webSocketOnly&&(n||z("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),i=!0),i)this.transports_=[ne];else{const s=this.transports_=[];for(const r of Nt.ALL_TRANSPORTS)r&&r.isAvailable()&&s.push(r);Nt.globalTransportInitialized_=!0}}initialTransport(){if(this.transports_.length>0)return this.transports_[0];throw new Error("No transports available")}upgradeTransport(){return this.transports_.length>1?this.transports_[1]:null}}Nt.globalTransportInitialized_=!1;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ch=6e4,bh=5e3,wh=10*1024,Eh=100*1024,Qn="t",er="d",Ih="s",tr="r",Sh="e",nr="o",ir="a",sr="n",rr="p",Th="h";class kh{constructor(e,n,i,s,r,o,a,l,c,u){this.id=e,this.repoInfo_=n,this.applicationId_=i,this.appCheckToken_=s,this.authToken_=r,this.onMessage_=o,this.onReady_=a,this.onDisconnect_=l,this.onKill_=c,this.lastSessionId=u,this.connectionCount=0,this.pendingDataMessages=[],this.state_=0,this.log_=Wt("c:"+this.id+":"),this.transportManager_=new Nt(n),this.log_("Connection created"),this.start_()}start_(){const e=this.transportManager_.initialTransport();this.conn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,null,this.lastSessionId),this.primaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const n=this.connReceiver_(this.conn_),i=this.disconnReceiver_(this.conn_);this.tx_=this.conn_,this.rx_=this.conn_,this.secondaryConn_=null,this.isHealthy_=!1,setTimeout(()=>{this.conn_&&this.conn_.open(n,i)},Math.floor(0));const s=e.healthyTimeout||0;s>0&&(this.healthyTimeout_=Ct(()=>{this.healthyTimeout_=null,this.isHealthy_||(this.conn_&&this.conn_.bytesReceived>Eh?(this.log_("Connection exceeded healthy timeout but has received "+this.conn_.bytesReceived+" bytes.  Marking connection healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()):this.conn_&&this.conn_.bytesSent>wh?this.log_("Connection exceeded healthy timeout but has sent "+this.conn_.bytesSent+" bytes.  Leaving connection alive."):(this.log_("Closing unhealthy connection after timeout."),this.close()))},Math.floor(s)))}nextTransportId_(){return"c:"+this.id+":"+this.connectionCount++}disconnReceiver_(e){return n=>{e===this.conn_?this.onConnectionLost_(n):e===this.secondaryConn_?(this.log_("Secondary connection lost."),this.onSecondaryConnectionLost_()):this.log_("closing an old connection")}}connReceiver_(e){return n=>{this.state_!==2&&(e===this.rx_?this.onPrimaryMessageReceived_(n):e===this.secondaryConn_?this.onSecondaryMessageReceived_(n):this.log_("message on old connection"))}}sendRequest(e){const n={t:"d",d:e};this.sendData_(n)}tryCleanupConnection(){this.tx_===this.secondaryConn_&&this.rx_===this.secondaryConn_&&(this.log_("cleaning up and promoting a connection: "+this.secondaryConn_.connId),this.conn_=this.secondaryConn_,this.secondaryConn_=null)}onSecondaryControl_(e){if(Qn in e){const n=e[Qn];n===ir?this.upgradeIfSecondaryHealthy_():n===tr?(this.log_("Got a reset on secondary, closing it"),this.secondaryConn_.close(),(this.tx_===this.secondaryConn_||this.rx_===this.secondaryConn_)&&this.close()):n===nr&&(this.log_("got pong on secondary."),this.secondaryResponsesRequired_--,this.upgradeIfSecondaryHealthy_())}}onSecondaryMessageReceived_(e){const n=_t("t",e),i=_t("d",e);if(n==="c")this.onSecondaryControl_(i);else if(n==="d")this.pendingDataMessages.push(i);else throw new Error("Unknown protocol layer: "+n)}upgradeIfSecondaryHealthy_(){this.secondaryResponsesRequired_<=0?(this.log_("Secondary connection is healthy."),this.isHealthy_=!0,this.secondaryConn_.markConnectionHealthy(),this.proceedWithUpgrade_()):(this.log_("sending ping on secondary."),this.secondaryConn_.send({t:"c",d:{t:rr,d:{}}}))}proceedWithUpgrade_(){this.secondaryConn_.start(),this.log_("sending client ack on secondary"),this.secondaryConn_.send({t:"c",d:{t:ir,d:{}}}),this.log_("Ending transmission on primary"),this.conn_.send({t:"c",d:{t:sr,d:{}}}),this.tx_=this.secondaryConn_,this.tryCleanupConnection()}onPrimaryMessageReceived_(e){const n=_t("t",e),i=_t("d",e);n==="c"?this.onControl_(i):n==="d"&&this.onDataMessage_(i)}onDataMessage_(e){this.onPrimaryResponse_(),this.onMessage_(e)}onPrimaryResponse_(){this.isHealthy_||(this.primaryResponsesRequired_--,this.primaryResponsesRequired_<=0&&(this.log_("Primary connection is healthy."),this.isHealthy_=!0,this.conn_.markConnectionHealthy()))}onControl_(e){const n=_t(Qn,e);if(er in e){const i=e[er];if(n===Th){const s=Object.assign({},i);this.repoInfo_.isUsingEmulator&&(s.h=this.repoInfo_.host),this.onHandshake_(s)}else if(n===sr){this.log_("recvd end transmission on primary"),this.rx_=this.secondaryConn_;for(let s=0;s<this.pendingDataMessages.length;++s)this.onDataMessage_(this.pendingDataMessages[s]);this.pendingDataMessages=[],this.tryCleanupConnection()}else n===Ih?this.onConnectionShutdown_(i):n===tr?this.onReset_(i):n===Sh?hi("Server Error: "+i):n===nr?(this.log_("got pong on primary."),this.onPrimaryResponse_(),this.sendPingOnPrimaryIfNecessary_()):hi("Unknown control packet command: "+n)}}onHandshake_(e){const n=e.ts,i=e.v,s=e.h;this.sessionId=e.s,this.repoInfo_.host=s,this.state_===0&&(this.conn_.start(),this.onConnectionEstablished_(this.conn_,n),Hi!==i&&z("Protocol version mismatch detected"),this.tryStartUpgrade_())}tryStartUpgrade_(){const e=this.transportManager_.upgradeTransport();e&&this.startUpgrade_(e)}startUpgrade_(e){this.secondaryConn_=new e(this.nextTransportId_(),this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,this.sessionId),this.secondaryResponsesRequired_=e.responsesRequiredToBeHealthy||0;const n=this.connReceiver_(this.secondaryConn_),i=this.disconnReceiver_(this.secondaryConn_);this.secondaryConn_.open(n,i),Ct(()=>{this.secondaryConn_&&(this.log_("Timed out trying to upgrade."),this.secondaryConn_.close())},Math.floor(Ch))}onReset_(e){this.log_("Reset packet received.  New host: "+e),this.repoInfo_.host=e,this.state_===1?this.close():(this.closeConnections_(),this.start_())}onConnectionEstablished_(e,n){this.log_("Realtime connection established."),this.conn_=e,this.state_=1,this.onReady_&&(this.onReady_(n,this.sessionId),this.onReady_=null),this.primaryResponsesRequired_===0?(this.log_("Primary connection is healthy."),this.isHealthy_=!0):Ct(()=>{this.sendPingOnPrimaryIfNecessary_()},Math.floor(bh))}sendPingOnPrimaryIfNecessary_(){!this.isHealthy_&&this.state_===1&&(this.log_("sending ping on primary."),this.sendData_({t:"c",d:{t:rr,d:{}}}))}onSecondaryConnectionLost_(){const e=this.secondaryConn_;this.secondaryConn_=null,(this.tx_===e||this.rx_===e)&&this.close()}onConnectionLost_(e){this.conn_=null,!e&&this.state_===0?(this.log_("Realtime connection failed."),this.repoInfo_.isCacheableHost()&&(Me.remove("host:"+this.repoInfo_.host),this.repoInfo_.internalHost=this.repoInfo_.host)):this.state_===1&&this.log_("Realtime connection lost."),this.close()}onConnectionShutdown_(e){this.log_("Connection shutdown command received. Shutting down..."),this.onKill_&&(this.onKill_(e),this.onKill_=null),this.onDisconnect_=null,this.close()}sendData_(e){if(this.state_!==1)throw"Connection is not connected";this.tx_.send(e)}close(){this.state_!==2&&(this.log_("Closing realtime connection."),this.state_=2,this.closeConnections_(),this.onDisconnect_&&(this.onDisconnect_(),this.onDisconnect_=null))}closeConnections_(){this.log_("Shutting down all connections"),this.conn_&&(this.conn_.close(),this.conn_=null),this.secondaryConn_&&(this.secondaryConn_.close(),this.secondaryConn_=null),this.healthyTimeout_&&(clearTimeout(this.healthyTimeout_),this.healthyTimeout_=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ko{put(e,n,i,s){}merge(e,n,i,s){}refreshAuthToken(e){}refreshAppCheckToken(e){}onDisconnectPut(e,n,i){}onDisconnectMerge(e,n,i){}onDisconnectCancel(e,n){}reportStats(e){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qo{constructor(e){this.allowedEvents_=e,this.listeners_={},_(Array.isArray(e)&&e.length>0,"Requires a non-empty array")}trigger(e,...n){if(Array.isArray(this.listeners_[e])){const i=[...this.listeners_[e]];for(let s=0;s<i.length;s++)i[s].callback.apply(i[s].context,n)}}on(e,n,i){this.validateEventType_(e),this.listeners_[e]=this.listeners_[e]||[],this.listeners_[e].push({callback:n,context:i});const s=this.getInitialEvent(e);s&&n.apply(i,s)}off(e,n,i){this.validateEventType_(e);const s=this.listeners_[e]||[];for(let r=0;r<s.length;r++)if(s[r].callback===n&&(!i||i===s[r].context)){s.splice(r,1);return}}validateEventType_(e){_(this.allowedEvents_.find(n=>n===e),"Unknown event: "+e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class an extends Qo{static getInstance(){return new an}constructor(){super(["online"]),this.online_=!0,typeof window<"u"&&typeof window.addEventListener<"u"&&!Yr()&&(window.addEventListener("online",()=>{this.online_||(this.online_=!0,this.trigger("online",!0))},!1),window.addEventListener("offline",()=>{this.online_&&(this.online_=!1,this.trigger("online",!1))},!1))}getInitialEvent(e){return _(e==="online","Unknown event type: "+e),[this.online_]}currentlyOnline(){return this.online_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const or=32,ar=768;class I{constructor(e,n){if(n===void 0){this.pieces_=e.split("/");let i=0;for(let s=0;s<this.pieces_.length;s++)this.pieces_[s].length>0&&(this.pieces_[i]=this.pieces_[s],i++);this.pieces_.length=i,this.pieceNum_=0}else this.pieces_=e,this.pieceNum_=n}toString(){let e="";for(let n=this.pieceNum_;n<this.pieces_.length;n++)this.pieces_[n]!==""&&(e+="/"+this.pieces_[n]);return e||"/"}}function E(){return new I("")}function v(t){return t.pieceNum_>=t.pieces_.length?null:t.pieces_[t.pieceNum_]}function Te(t){return t.pieces_.length-t.pieceNum_}function S(t){let e=t.pieceNum_;return e<t.pieces_.length&&e++,new I(t.pieces_,e)}function qi(t){return t.pieceNum_<t.pieces_.length?t.pieces_[t.pieces_.length-1]:null}function Nh(t){let e="";for(let n=t.pieceNum_;n<t.pieces_.length;n++)t.pieces_[n]!==""&&(e+="/"+encodeURIComponent(String(t.pieces_[n])));return e||"/"}function At(t,e=0){return t.pieces_.slice(t.pieceNum_+e)}function Xo(t){if(t.pieceNum_>=t.pieces_.length)return null;const e=[];for(let n=t.pieceNum_;n<t.pieces_.length-1;n++)e.push(t.pieces_[n]);return new I(e,0)}function A(t,e){const n=[];for(let i=t.pieceNum_;i<t.pieces_.length;i++)n.push(t.pieces_[i]);if(e instanceof I)for(let i=e.pieceNum_;i<e.pieces_.length;i++)n.push(e.pieces_[i]);else{const i=e.split("/");for(let s=0;s<i.length;s++)i[s].length>0&&n.push(i[s])}return new I(n,0)}function y(t){return t.pieceNum_>=t.pieces_.length}function H(t,e){const n=v(t),i=v(e);if(n===null)return e;if(n===i)return H(S(t),S(e));throw new Error("INTERNAL ERROR: innerPath ("+e+") is not within outerPath ("+t+")")}function Ah(t,e){const n=At(t,0),i=At(e,0);for(let s=0;s<n.length&&s<i.length;s++){const r=je(n[s],i[s]);if(r!==0)return r}return n.length===i.length?0:n.length<i.length?-1:1}function Gi(t,e){if(Te(t)!==Te(e))return!1;for(let n=t.pieceNum_,i=e.pieceNum_;n<=t.pieces_.length;n++,i++)if(t.pieces_[n]!==e.pieces_[i])return!1;return!0}function J(t,e){let n=t.pieceNum_,i=e.pieceNum_;if(Te(t)>Te(e))return!1;for(;n<t.pieces_.length;){if(t.pieces_[n]!==e.pieces_[i])return!1;++n,++i}return!0}class Rh{constructor(e,n){this.errorPrefix_=n,this.parts_=At(e,0),this.byteLength_=Math.max(1,this.parts_.length);for(let i=0;i<this.parts_.length;i++)this.byteLength_+=In(this.parts_[i]);Jo(this)}}function Ph(t,e){t.parts_.length>0&&(t.byteLength_+=1),t.parts_.push(e),t.byteLength_+=In(e),Jo(t)}function Dh(t){const e=t.parts_.pop();t.byteLength_-=In(e),t.parts_.length>0&&(t.byteLength_-=1)}function Jo(t){if(t.byteLength_>ar)throw new Error(t.errorPrefix_+"has a key path longer than "+ar+" bytes ("+t.byteLength_+").");if(t.parts_.length>or)throw new Error(t.errorPrefix_+"path specified exceeds the maximum depth that can be written ("+or+") or object contains a cycle "+De(t))}function De(t){return t.parts_.length===0?"":"in property '"+t.parts_.join(".")+"'"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yi extends Qo{static getInstance(){return new Yi}constructor(){super(["visible"]);let e,n;typeof document<"u"&&typeof document.addEventListener<"u"&&(typeof document.hidden<"u"?(n="visibilitychange",e="hidden"):typeof document.mozHidden<"u"?(n="mozvisibilitychange",e="mozHidden"):typeof document.msHidden<"u"?(n="msvisibilitychange",e="msHidden"):typeof document.webkitHidden<"u"&&(n="webkitvisibilitychange",e="webkitHidden")),this.visible_=!0,n&&document.addEventListener(n,()=>{const i=!document[e];i!==this.visible_&&(this.visible_=i,this.trigger("visible",i))},!1)}getInitialEvent(e){return _(e==="visible","Unknown event type: "+e),[this.visible_]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pt=1e3,xh=60*5*1e3,lr=30*1e3,Oh=1.3,Mh=3e4,Lh="server_kill",cr=3;class he extends Ko{constructor(e,n,i,s,r,o,a,l){if(super(),this.repoInfo_=e,this.applicationId_=n,this.onDataUpdate_=i,this.onConnectStatus_=s,this.onServerInfoUpdate_=r,this.authTokenProvider_=o,this.appCheckTokenProvider_=a,this.authOverride_=l,this.id=he.nextPersistentConnectionId_++,this.log_=Wt("p:"+this.id+":"),this.interruptReasons_={},this.listens=new Map,this.outstandingPuts_=[],this.outstandingGets_=[],this.outstandingPutCount_=0,this.outstandingGetCount_=0,this.onDisconnectRequestQueue_=[],this.connected_=!1,this.reconnectDelay_=pt,this.maxReconnectDelay_=xh,this.securityDebugCallback_=null,this.lastSessionId=null,this.establishConnectionTimer_=null,this.visible_=!1,this.requestCBHash_={},this.requestNumber_=0,this.realtime_=null,this.authToken_=null,this.appCheckToken_=null,this.forceTokenRefresh_=!1,this.invalidAuthTokenCount_=0,this.invalidAppCheckTokenCount_=0,this.firstConnection_=!0,this.lastConnectionAttemptTime_=null,this.lastConnectionEstablishedTime_=null,l)throw new Error("Auth override specified in options, but not supported on non Node.js platforms");Yi.getInstance().on("visible",this.onVisible_,this),e.host.indexOf("fblocal")===-1&&an.getInstance().on("online",this.onOnline_,this)}sendRequest(e,n,i){const s=++this.requestNumber_,r={r:s,a:e,b:n};this.log_(O(r)),_(this.connected_,"sendRequest call when we're not connected not allowed."),this.realtime_.sendRequest(r),i&&(this.requestCBHash_[s]=i)}get(e){this.initConnection_();const n=new ae,s={action:"g",request:{p:e._path.toString(),q:e._queryObject},onComplete:o=>{const a=o.d;o.s==="ok"?n.resolve(a):n.reject(a)}};this.outstandingGets_.push(s),this.outstandingGetCount_++;const r=this.outstandingGets_.length-1;return this.connected_&&this.sendGet_(r),n.promise}listen(e,n,i,s){this.initConnection_();const r=e._queryIdentifier,o=e._path.toString();this.log_("Listen called for "+o+" "+r),this.listens.has(o)||this.listens.set(o,new Map),_(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"listen() called for non-default but complete query"),_(!this.listens.get(o).has(r),"listen() called twice for same path/queryId.");const a={onComplete:s,hashFn:n,query:e,tag:i};this.listens.get(o).set(r,a),this.connected_&&this.sendListen_(a)}sendGet_(e){const n=this.outstandingGets_[e];this.sendRequest("g",n.request,i=>{delete this.outstandingGets_[e],this.outstandingGetCount_--,this.outstandingGetCount_===0&&(this.outstandingGets_=[]),n.onComplete&&n.onComplete(i)})}sendListen_(e){const n=e.query,i=n._path.toString(),s=n._queryIdentifier;this.log_("Listen on "+i+" for "+s);const r={p:i},o="q";e.tag&&(r.q=n._queryObject,r.t=e.tag),r.h=e.hashFn(),this.sendRequest(o,r,a=>{const l=a.d,c=a.s;he.warnOnListenWarnings_(l,n),(this.listens.get(i)&&this.listens.get(i).get(s))===e&&(this.log_("listen response",a),c!=="ok"&&this.removeListen_(i,s),e.onComplete&&e.onComplete(c,l))})}static warnOnListenWarnings_(e,n){if(e&&typeof e=="object"&&ce(e,"w")){const i=et(e,"w");if(Array.isArray(i)&&~i.indexOf("no_index")){const s='".indexOn": "'+n._queryParams.getIndex().toString()+'"',r=n._path.toString();z(`Using an unspecified index. Your data will be downloaded and filtered on the client. Consider adding ${s} at ${r} to your security rules for better performance.`)}}}refreshAuthToken(e){this.authToken_=e,this.log_("Auth token refreshed"),this.authToken_?this.tryAuth():this.connected_&&this.sendRequest("unauth",{},()=>{}),this.reduceReconnectDelayIfAdminCredential_(e)}reduceReconnectDelayIfAdminCredential_(e){(e&&e.length===40||tc(e))&&(this.log_("Admin auth credential detected.  Reducing max reconnect time."),this.maxReconnectDelay_=lr)}refreshAppCheckToken(e){this.appCheckToken_=e,this.log_("App check token refreshed"),this.appCheckToken_?this.tryAppCheck():this.connected_&&this.sendRequest("unappeck",{},()=>{})}tryAuth(){if(this.connected_&&this.authToken_){const e=this.authToken_,n=ec(e)?"auth":"gauth",i={cred:e};this.authOverride_===null?i.noauth=!0:typeof this.authOverride_=="object"&&(i.authvar=this.authOverride_),this.sendRequest(n,i,s=>{const r=s.s,o=s.d||"error";this.authToken_===e&&(r==="ok"?this.invalidAuthTokenCount_=0:this.onAuthRevoked_(r,o))})}}tryAppCheck(){this.connected_&&this.appCheckToken_&&this.sendRequest("appcheck",{token:this.appCheckToken_},e=>{const n=e.s,i=e.d||"error";n==="ok"?this.invalidAppCheckTokenCount_=0:this.onAppCheckRevoked_(n,i)})}unlisten(e,n){const i=e._path.toString(),s=e._queryIdentifier;this.log_("Unlisten called for "+i+" "+s),_(e._queryParams.isDefault()||!e._queryParams.loadsAllData(),"unlisten() called for non-default but complete query"),this.removeListen_(i,s)&&this.connected_&&this.sendUnlisten_(i,s,e._queryObject,n)}sendUnlisten_(e,n,i,s){this.log_("Unlisten on "+e+" for "+n);const r={p:e},o="n";s&&(r.q=i,r.t=s),this.sendRequest(o,r)}onDisconnectPut(e,n,i){this.initConnection_(),this.connected_?this.sendOnDisconnect_("o",e,n,i):this.onDisconnectRequestQueue_.push({pathString:e,action:"o",data:n,onComplete:i})}onDisconnectMerge(e,n,i){this.initConnection_(),this.connected_?this.sendOnDisconnect_("om",e,n,i):this.onDisconnectRequestQueue_.push({pathString:e,action:"om",data:n,onComplete:i})}onDisconnectCancel(e,n){this.initConnection_(),this.connected_?this.sendOnDisconnect_("oc",e,null,n):this.onDisconnectRequestQueue_.push({pathString:e,action:"oc",data:null,onComplete:n})}sendOnDisconnect_(e,n,i,s){const r={p:n,d:i};this.log_("onDisconnect "+e,r),this.sendRequest(e,r,o=>{s&&setTimeout(()=>{s(o.s,o.d)},Math.floor(0))})}put(e,n,i,s){this.putInternal("p",e,n,i,s)}merge(e,n,i,s){this.putInternal("m",e,n,i,s)}putInternal(e,n,i,s,r){this.initConnection_();const o={p:n,d:i};r!==void 0&&(o.h=r),this.outstandingPuts_.push({action:e,request:o,onComplete:s}),this.outstandingPutCount_++;const a=this.outstandingPuts_.length-1;this.connected_?this.sendPut_(a):this.log_("Buffering put: "+n)}sendPut_(e){const n=this.outstandingPuts_[e].action,i=this.outstandingPuts_[e].request,s=this.outstandingPuts_[e].onComplete;this.outstandingPuts_[e].queued=this.connected_,this.sendRequest(n,i,r=>{this.log_(n+" response",r),delete this.outstandingPuts_[e],this.outstandingPutCount_--,this.outstandingPutCount_===0&&(this.outstandingPuts_=[]),s&&s(r.s,r.d)})}reportStats(e){if(this.connected_){const n={c:e};this.log_("reportStats",n),this.sendRequest("s",n,i=>{if(i.s!=="ok"){const r=i.d;this.log_("reportStats","Error sending stats: "+r)}})}}onDataMessage_(e){if("r"in e){this.log_("from server: "+O(e));const n=e.r,i=this.requestCBHash_[n];i&&(delete this.requestCBHash_[n],i(e.b))}else{if("error"in e)throw"A server-side error has occurred: "+e.error;"a"in e&&this.onDataPush_(e.a,e.b)}}onDataPush_(e,n){this.log_("handleServerMessage",e,n),e==="d"?this.onDataUpdate_(n.p,n.d,!1,n.t):e==="m"?this.onDataUpdate_(n.p,n.d,!0,n.t):e==="c"?this.onListenRevoked_(n.p,n.q):e==="ac"?this.onAuthRevoked_(n.s,n.d):e==="apc"?this.onAppCheckRevoked_(n.s,n.d):e==="sd"?this.onSecurityDebugPacket_(n):hi("Unrecognized action received from server: "+O(e)+`
Are you using the latest client?`)}onReady_(e,n){this.log_("connection ready"),this.connected_=!0,this.lastConnectionEstablishedTime_=new Date().getTime(),this.handleTimestamp_(e),this.lastSessionId=n,this.firstConnection_&&this.sendConnectStats_(),this.restoreState_(),this.firstConnection_=!1,this.onConnectStatus_(!0)}scheduleConnect_(e){_(!this.realtime_,"Scheduling a connect when we're already connected/ing?"),this.establishConnectionTimer_&&clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=setTimeout(()=>{this.establishConnectionTimer_=null,this.establishConnection_()},Math.floor(e))}initConnection_(){!this.realtime_&&this.firstConnection_&&this.scheduleConnect_(0)}onVisible_(e){e&&!this.visible_&&this.reconnectDelay_===this.maxReconnectDelay_&&(this.log_("Window became visible.  Reducing delay."),this.reconnectDelay_=pt,this.realtime_||this.scheduleConnect_(0)),this.visible_=e}onOnline_(e){e?(this.log_("Browser went online."),this.reconnectDelay_=pt,this.realtime_||this.scheduleConnect_(0)):(this.log_("Browser went offline.  Killing connection."),this.realtime_&&this.realtime_.close())}onRealtimeDisconnect_(){if(this.log_("data client disconnected"),this.connected_=!1,this.realtime_=null,this.cancelSentTransactions_(),this.requestCBHash_={},this.shouldReconnect_()){this.visible_?this.lastConnectionEstablishedTime_&&(new Date().getTime()-this.lastConnectionEstablishedTime_>Mh&&(this.reconnectDelay_=pt),this.lastConnectionEstablishedTime_=null):(this.log_("Window isn't visible.  Delaying reconnect."),this.reconnectDelay_=this.maxReconnectDelay_,this.lastConnectionAttemptTime_=new Date().getTime());const e=Math.max(0,new Date().getTime()-this.lastConnectionAttemptTime_);let n=Math.max(0,this.reconnectDelay_-e);n=Math.random()*n,this.log_("Trying to reconnect in "+n+"ms"),this.scheduleConnect_(n),this.reconnectDelay_=Math.min(this.maxReconnectDelay_,this.reconnectDelay_*Oh)}this.onConnectStatus_(!1)}async establishConnection_(){if(this.shouldReconnect_()){this.log_("Making a connection attempt"),this.lastConnectionAttemptTime_=new Date().getTime(),this.lastConnectionEstablishedTime_=null;const e=this.onDataMessage_.bind(this),n=this.onReady_.bind(this),i=this.onRealtimeDisconnect_.bind(this),s=this.id+":"+he.nextConnectionId_++,r=this.lastSessionId;let o=!1,a=null;const l=function(){a?a.close():(o=!0,i())},c=function(d){_(a,"sendRequest call when we're not connected not allowed."),a.sendRequest(d)};this.realtime_={close:l,sendRequest:c};const u=this.forceTokenRefresh_;this.forceTokenRefresh_=!1;try{const[d,h]=await Promise.all([this.authTokenProvider_.getToken(u),this.appCheckTokenProvider_.getToken(u)]);o?F("getToken() completed but was canceled"):(F("getToken() completed. Creating connection."),this.authToken_=d&&d.accessToken,this.appCheckToken_=h&&h.token,a=new kh(s,this.repoInfo_,this.applicationId_,this.appCheckToken_,this.authToken_,e,n,i,f=>{z(f+" ("+this.repoInfo_.toString()+")"),this.interrupt(Lh)},r))}catch(d){this.log_("Failed to get token: "+d),o||(this.repoInfo_.nodeAdmin&&z(d),l())}}}interrupt(e){F("Interrupting connection for reason: "+e),this.interruptReasons_[e]=!0,this.realtime_?this.realtime_.close():(this.establishConnectionTimer_&&(clearTimeout(this.establishConnectionTimer_),this.establishConnectionTimer_=null),this.connected_&&this.onRealtimeDisconnect_())}resume(e){F("Resuming connection for reason: "+e),delete this.interruptReasons_[e],ri(this.interruptReasons_)&&(this.reconnectDelay_=pt,this.realtime_||this.scheduleConnect_(0))}handleTimestamp_(e){const n=e-new Date().getTime();this.onServerInfoUpdate_({serverTimeOffset:n})}cancelSentTransactions_(){for(let e=0;e<this.outstandingPuts_.length;e++){const n=this.outstandingPuts_[e];n&&"h"in n.request&&n.queued&&(n.onComplete&&n.onComplete("disconnect"),delete this.outstandingPuts_[e],this.outstandingPutCount_--)}this.outstandingPutCount_===0&&(this.outstandingPuts_=[])}onListenRevoked_(e,n){let i;n?i=n.map(r=>Ui(r)).join("$"):i="default";const s=this.removeListen_(e,i);s&&s.onComplete&&s.onComplete("permission_denied")}removeListen_(e,n){const i=new I(e).toString();let s;if(this.listens.has(i)){const r=this.listens.get(i);s=r.get(n),r.delete(n),r.size===0&&this.listens.delete(i)}else s=void 0;return s}onAuthRevoked_(e,n){F("Auth token revoked: "+e+"/"+n),this.authToken_=null,this.forceTokenRefresh_=!0,this.realtime_.close(),(e==="invalid_token"||e==="permission_denied")&&(this.invalidAuthTokenCount_++,this.invalidAuthTokenCount_>=cr&&(this.reconnectDelay_=lr,this.authTokenProvider_.notifyForInvalidToken()))}onAppCheckRevoked_(e,n){F("App check token revoked: "+e+"/"+n),this.appCheckToken_=null,this.forceTokenRefresh_=!0,(e==="invalid_token"||e==="permission_denied")&&(this.invalidAppCheckTokenCount_++,this.invalidAppCheckTokenCount_>=cr&&this.appCheckTokenProvider_.notifyForInvalidToken())}onSecurityDebugPacket_(e){this.securityDebugCallback_?this.securityDebugCallback_(e):"msg"in e&&console.log("FIREBASE: "+e.msg.replace(`
`,`
FIREBASE: `))}restoreState_(){this.tryAuth(),this.tryAppCheck();for(const e of this.listens.values())for(const n of e.values())this.sendListen_(n);for(let e=0;e<this.outstandingPuts_.length;e++)this.outstandingPuts_[e]&&this.sendPut_(e);for(;this.onDisconnectRequestQueue_.length;){const e=this.onDisconnectRequestQueue_.shift();this.sendOnDisconnect_(e.action,e.pathString,e.data,e.onComplete)}for(let e=0;e<this.outstandingGets_.length;e++)this.outstandingGets_[e]&&this.sendGet_(e)}sendConnectStats_(){const e={};let n="js";e["sdk."+n+"."+No.replace(/\./g,"-")]=1,Yr()?e["framework.cordova"]=1:Yl()&&(e["framework.reactnative"]=1),this.reportStats(e)}shouldReconnect_(){const e=an.getInstance().currentlyOnline();return ri(this.interruptReasons_)&&e}}he.nextPersistentConnectionId_=0;he.nextConnectionId_=0;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class C{constructor(e,n){this.name=e,this.node=n}static Wrap(e,n){return new C(e,n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nn{getCompare(){return this.compare.bind(this)}indexedValueChanged(e,n){const i=new C(nt,e),s=new C(nt,n);return this.compare(i,s)!==0}minPost(){return C.MIN}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Gt;class Zo extends Nn{static get __EMPTY_NODE(){return Gt}static set __EMPTY_NODE(e){Gt=e}compare(e,n){return je(e.name,n.name)}isDefinedOn(e){throw at("KeyIndex.isDefinedOn not expected to be called.")}indexedValueChanged(e,n){return!1}minPost(){return C.MIN}maxPost(){return new C(Ve,Gt)}makePost(e,n){return _(typeof e=="string","KeyIndex indexValue must always be a string."),new C(e,Gt)}toString(){return".key"}}const Je=new Zo;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yt{constructor(e,n,i,s,r=null){this.isReverse_=s,this.resultGenerator_=r,this.nodeStack_=[];let o=1;for(;!e.isEmpty();)if(e=e,o=n?i(e.key,n):1,s&&(o*=-1),o<0)this.isReverse_?e=e.left:e=e.right;else if(o===0){this.nodeStack_.push(e);break}else this.nodeStack_.push(e),this.isReverse_?e=e.right:e=e.left}getNext(){if(this.nodeStack_.length===0)return null;let e=this.nodeStack_.pop(),n;if(this.resultGenerator_?n=this.resultGenerator_(e.key,e.value):n={key:e.key,value:e.value},this.isReverse_)for(e=e.left;!e.isEmpty();)this.nodeStack_.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack_.push(e),e=e.left;return n}hasNext(){return this.nodeStack_.length>0}peek(){if(this.nodeStack_.length===0)return null;const e=this.nodeStack_[this.nodeStack_.length-1];return this.resultGenerator_?this.resultGenerator_(e.key,e.value):{key:e.key,value:e.value}}}class L{constructor(e,n,i,s,r){this.key=e,this.value=n,this.color=i??L.RED,this.left=s??G.EMPTY_NODE,this.right=r??G.EMPTY_NODE}copy(e,n,i,s,r){return new L(e??this.key,n??this.value,i??this.color,s??this.left,r??this.right)}count(){return this.left.count()+1+this.right.count()}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||!!e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min_(){return this.left.isEmpty()?this:this.left.min_()}minKey(){return this.min_().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,n,i){let s=this;const r=i(e,s.key);return r<0?s=s.copy(null,null,null,s.left.insert(e,n,i),null):r===0?s=s.copy(null,n,null,null,null):s=s.copy(null,null,null,null,s.right.insert(e,n,i)),s.fixUp_()}removeMin_(){if(this.left.isEmpty())return G.EMPTY_NODE;let e=this;return!e.left.isRed_()&&!e.left.left.isRed_()&&(e=e.moveRedLeft_()),e=e.copy(null,null,null,e.left.removeMin_(),null),e.fixUp_()}remove(e,n){let i,s;if(i=this,n(e,i.key)<0)!i.left.isEmpty()&&!i.left.isRed_()&&!i.left.left.isRed_()&&(i=i.moveRedLeft_()),i=i.copy(null,null,null,i.left.remove(e,n),null);else{if(i.left.isRed_()&&(i=i.rotateRight_()),!i.right.isEmpty()&&!i.right.isRed_()&&!i.right.left.isRed_()&&(i=i.moveRedRight_()),n(e,i.key)===0){if(i.right.isEmpty())return G.EMPTY_NODE;s=i.right.min_(),i=i.copy(s.key,s.value,null,null,i.right.removeMin_())}i=i.copy(null,null,null,null,i.right.remove(e,n))}return i.fixUp_()}isRed_(){return this.color}fixUp_(){let e=this;return e.right.isRed_()&&!e.left.isRed_()&&(e=e.rotateLeft_()),e.left.isRed_()&&e.left.left.isRed_()&&(e=e.rotateRight_()),e.left.isRed_()&&e.right.isRed_()&&(e=e.colorFlip_()),e}moveRedLeft_(){let e=this.colorFlip_();return e.right.left.isRed_()&&(e=e.copy(null,null,null,null,e.right.rotateRight_()),e=e.rotateLeft_(),e=e.colorFlip_()),e}moveRedRight_(){let e=this.colorFlip_();return e.left.left.isRed_()&&(e=e.rotateRight_(),e=e.colorFlip_()),e}rotateLeft_(){const e=this.copy(null,null,L.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight_(){const e=this.copy(null,null,L.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip_(){const e=this.left.copy(null,null,!this.left.color,null,null),n=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,n)}checkMaxDepth_(){const e=this.check_();return Math.pow(2,e)<=this.count()+1}check_(){if(this.isRed_()&&this.left.isRed_())throw new Error("Red node has red child("+this.key+","+this.value+")");if(this.right.isRed_())throw new Error("Right child of ("+this.key+","+this.value+") is red");const e=this.left.check_();if(e!==this.right.check_())throw new Error("Black depths differ");return e+(this.isRed_()?0:1)}}L.RED=!0;L.BLACK=!1;class Fh{copy(e,n,i,s,r){return this}insert(e,n,i){return new L(e,n,null)}remove(e,n){return this}count(){return 0}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}check_(){return 0}isRed_(){return!1}}class G{constructor(e,n=G.EMPTY_NODE){this.comparator_=e,this.root_=n}insert(e,n){return new G(this.comparator_,this.root_.insert(e,n,this.comparator_).copy(null,null,L.BLACK,null,null))}remove(e){return new G(this.comparator_,this.root_.remove(e,this.comparator_).copy(null,null,L.BLACK,null,null))}get(e){let n,i=this.root_;for(;!i.isEmpty();){if(n=this.comparator_(e,i.key),n===0)return i.value;n<0?i=i.left:n>0&&(i=i.right)}return null}getPredecessorKey(e){let n,i=this.root_,s=null;for(;!i.isEmpty();)if(n=this.comparator_(e,i.key),n===0){if(i.left.isEmpty())return s?s.key:null;for(i=i.left;!i.right.isEmpty();)i=i.right;return i.key}else n<0?i=i.left:n>0&&(s=i,i=i.right);throw new Error("Attempted to find predecessor key for a nonexistent key.  What gives?")}isEmpty(){return this.root_.isEmpty()}count(){return this.root_.count()}minKey(){return this.root_.minKey()}maxKey(){return this.root_.maxKey()}inorderTraversal(e){return this.root_.inorderTraversal(e)}reverseTraversal(e){return this.root_.reverseTraversal(e)}getIterator(e){return new Yt(this.root_,null,this.comparator_,!1,e)}getIteratorFrom(e,n){return new Yt(this.root_,e,this.comparator_,!1,n)}getReverseIteratorFrom(e,n){return new Yt(this.root_,e,this.comparator_,!0,n)}getReverseIterator(e){return new Yt(this.root_,null,this.comparator_,!0,e)}}G.EMPTY_NODE=new Fh;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Bh(t,e){return je(t.name,e.name)}function Ki(t,e){return je(t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let _i;function Vh(t){_i=t}const ea=function(t){return typeof t=="number"?"number:"+Do(t):"string:"+t},ta=function(t){if(t.isLeafNode()){const e=t.val();_(typeof e=="string"||typeof e=="number"||typeof e=="object"&&ce(e,".sv"),"Priority must be a string or number.")}else _(t===_i||t.isEmpty(),"priority of unexpected type.");_(t===_i||t.getPriority().isEmpty(),"Priority nodes can't have a priority of their own.")};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ur;class M{static set __childrenNodeConstructor(e){ur=e}static get __childrenNodeConstructor(){return ur}constructor(e,n=M.__childrenNodeConstructor.EMPTY_NODE){this.value_=e,this.priorityNode_=n,this.lazyHash_=null,_(this.value_!==void 0&&this.value_!==null,"LeafNode shouldn't be created with null/undefined value."),ta(this.priorityNode_)}isLeafNode(){return!0}getPriority(){return this.priorityNode_}updatePriority(e){return new M(this.value_,e)}getImmediateChild(e){return e===".priority"?this.priorityNode_:M.__childrenNodeConstructor.EMPTY_NODE}getChild(e){return y(e)?this:v(e)===".priority"?this.priorityNode_:M.__childrenNodeConstructor.EMPTY_NODE}hasChild(){return!1}getPredecessorChildName(e,n){return null}updateImmediateChild(e,n){return e===".priority"?this.updatePriority(n):n.isEmpty()&&e!==".priority"?this:M.__childrenNodeConstructor.EMPTY_NODE.updateImmediateChild(e,n).updatePriority(this.priorityNode_)}updateChild(e,n){const i=v(e);return i===null?n:n.isEmpty()&&i!==".priority"?this:(_(i!==".priority"||Te(e)===1,".priority must be the last token in a path"),this.updateImmediateChild(i,M.__childrenNodeConstructor.EMPTY_NODE.updateChild(S(e),n)))}isEmpty(){return!1}numChildren(){return 0}forEachChild(e,n){return!1}val(e){return e&&!this.getPriority().isEmpty()?{".value":this.getValue(),".priority":this.getPriority().val()}:this.getValue()}hash(){if(this.lazyHash_===null){let e="";this.priorityNode_.isEmpty()||(e+="priority:"+ea(this.priorityNode_.val())+":");const n=typeof this.value_;e+=n+":",n==="number"?e+=Do(this.value_):e+=this.value_,this.lazyHash_=Ro(e)}return this.lazyHash_}getValue(){return this.value_}compareTo(e){return e===M.__childrenNodeConstructor.EMPTY_NODE?1:e instanceof M.__childrenNodeConstructor?-1:(_(e.isLeafNode(),"Unknown node type"),this.compareToLeafNode_(e))}compareToLeafNode_(e){const n=typeof e.value_,i=typeof this.value_,s=M.VALUE_TYPE_ORDER.indexOf(n),r=M.VALUE_TYPE_ORDER.indexOf(i);return _(s>=0,"Unknown leaf type: "+n),_(r>=0,"Unknown leaf type: "+i),s===r?i==="object"?0:this.value_<e.value_?-1:this.value_===e.value_?0:1:r-s}withIndex(){return this}isIndexed(){return!0}equals(e){if(e===this)return!0;if(e.isLeafNode()){const n=e;return this.value_===n.value_&&this.priorityNode_.equals(n.priorityNode_)}else return!1}}M.VALUE_TYPE_ORDER=["object","boolean","number","string"];/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let na,ia;function $h(t){na=t}function Wh(t){ia=t}class Uh extends Nn{compare(e,n){const i=e.node.getPriority(),s=n.node.getPriority(),r=i.compareTo(s);return r===0?je(e.name,n.name):r}isDefinedOn(e){return!e.getPriority().isEmpty()}indexedValueChanged(e,n){return!e.getPriority().equals(n.getPriority())}minPost(){return C.MIN}maxPost(){return new C(Ve,new M("[PRIORITY-POST]",ia))}makePost(e,n){const i=na(e);return new C(n,new M("[PRIORITY-POST]",i))}toString(){return".priority"}}const R=new Uh;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hh=Math.log(2);class zh{constructor(e){const n=r=>parseInt(Math.log(r)/Hh,10),i=r=>parseInt(Array(r+1).join("1"),2);this.count=n(e+1),this.current_=this.count-1;const s=i(this.count);this.bits_=e+1&s}nextBitIsOne(){const e=!(this.bits_&1<<this.current_);return this.current_--,e}}const ln=function(t,e,n,i){t.sort(e);const s=function(l,c){const u=c-l;let d,h;if(u===0)return null;if(u===1)return d=t[l],h=n?n(d):d,new L(h,d.node,L.BLACK,null,null);{const f=parseInt(u/2,10)+l,p=s(l,f),b=s(f+1,c);return d=t[f],h=n?n(d):d,new L(h,d.node,L.BLACK,p,b)}},r=function(l){let c=null,u=null,d=t.length;const h=function(p,b){const T=d-p,W=d;d-=p;const j=s(T+1,W),q=t[T],$=n?n(q):q;f(new L($,q.node,b,null,j))},f=function(p){c?(c.left=p,c=p):(u=p,c=p)};for(let p=0;p<l.count;++p){const b=l.nextBitIsOne(),T=Math.pow(2,l.count-(p+1));b?h(T,L.BLACK):(h(T,L.BLACK),h(T,L.RED))}return u},o=new zh(t.length),a=r(o);return new G(i||e,a)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Xn;const Ke={};class de{static get Default(){return _(Ke&&R,"ChildrenNode.ts has not been loaded"),Xn=Xn||new de({".priority":Ke},{".priority":R}),Xn}constructor(e,n){this.indexes_=e,this.indexSet_=n}get(e){const n=et(this.indexes_,e);if(!n)throw new Error("No index defined for "+e);return n instanceof G?n:null}hasIndex(e){return ce(this.indexSet_,e.toString())}addIndex(e,n){_(e!==Je,"KeyIndex always exists and isn't meant to be added to the IndexMap.");const i=[];let s=!1;const r=n.getIterator(C.Wrap);let o=r.getNext();for(;o;)s=s||e.isDefinedOn(o.node),i.push(o),o=r.getNext();let a;s?a=ln(i,e.getCompare()):a=Ke;const l=e.toString(),c=Object.assign({},this.indexSet_);c[l]=e;const u=Object.assign({},this.indexes_);return u[l]=a,new de(u,c)}addToIndexes(e,n){const i=tn(this.indexes_,(s,r)=>{const o=et(this.indexSet_,r);if(_(o,"Missing index implementation for "+r),s===Ke)if(o.isDefinedOn(e.node)){const a=[],l=n.getIterator(C.Wrap);let c=l.getNext();for(;c;)c.name!==e.name&&a.push(c),c=l.getNext();return a.push(e),ln(a,o.getCompare())}else return Ke;else{const a=n.get(e.name);let l=s;return a&&(l=l.remove(new C(e.name,a))),l.insert(e,e.node)}});return new de(i,this.indexSet_)}removeFromIndexes(e,n){const i=tn(this.indexes_,s=>{if(s===Ke)return s;{const r=n.get(e.name);return r?s.remove(new C(e.name,r)):s}});return new de(i,this.indexSet_)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let gt;class m{static get EMPTY_NODE(){return gt||(gt=new m(new G(Ki),null,de.Default))}constructor(e,n,i){this.children_=e,this.priorityNode_=n,this.indexMap_=i,this.lazyHash_=null,this.priorityNode_&&ta(this.priorityNode_),this.children_.isEmpty()&&_(!this.priorityNode_||this.priorityNode_.isEmpty(),"An empty node cannot have a priority")}isLeafNode(){return!1}getPriority(){return this.priorityNode_||gt}updatePriority(e){return this.children_.isEmpty()?this:new m(this.children_,e,this.indexMap_)}getImmediateChild(e){if(e===".priority")return this.getPriority();{const n=this.children_.get(e);return n===null?gt:n}}getChild(e){const n=v(e);return n===null?this:this.getImmediateChild(n).getChild(S(e))}hasChild(e){return this.children_.get(e)!==null}updateImmediateChild(e,n){if(_(n,"We should always be passing snapshot nodes"),e===".priority")return this.updatePriority(n);{const i=new C(e,n);let s,r;n.isEmpty()?(s=this.children_.remove(e),r=this.indexMap_.removeFromIndexes(i,this.children_)):(s=this.children_.insert(e,n),r=this.indexMap_.addToIndexes(i,this.children_));const o=s.isEmpty()?gt:this.priorityNode_;return new m(s,o,r)}}updateChild(e,n){const i=v(e);if(i===null)return n;{_(v(e)!==".priority"||Te(e)===1,".priority must be the last token in a path");const s=this.getImmediateChild(i).updateChild(S(e),n);return this.updateImmediateChild(i,s)}}isEmpty(){return this.children_.isEmpty()}numChildren(){return this.children_.count()}val(e){if(this.isEmpty())return null;const n={};let i=0,s=0,r=!0;if(this.forEachChild(R,(o,a)=>{n[o]=a.val(e),i++,r&&m.INTEGER_REGEXP_.test(o)?s=Math.max(s,Number(o)):r=!1}),!e&&r&&s<2*i){const o=[];for(const a in n)o[a]=n[a];return o}else return e&&!this.getPriority().isEmpty()&&(n[".priority"]=this.getPriority().val()),n}hash(){if(this.lazyHash_===null){let e="";this.getPriority().isEmpty()||(e+="priority:"+ea(this.getPriority().val())+":"),this.forEachChild(R,(n,i)=>{const s=i.hash();s!==""&&(e+=":"+n+":"+s)}),this.lazyHash_=e===""?"":Ro(e)}return this.lazyHash_}getPredecessorChildName(e,n,i){const s=this.resolveIndex_(i);if(s){const r=s.getPredecessorKey(new C(e,n));return r?r.name:null}else return this.children_.getPredecessorKey(e)}getFirstChildName(e){const n=this.resolveIndex_(e);if(n){const i=n.minKey();return i&&i.name}else return this.children_.minKey()}getFirstChild(e){const n=this.getFirstChildName(e);return n?new C(n,this.children_.get(n)):null}getLastChildName(e){const n=this.resolveIndex_(e);if(n){const i=n.maxKey();return i&&i.name}else return this.children_.maxKey()}getLastChild(e){const n=this.getLastChildName(e);return n?new C(n,this.children_.get(n)):null}forEachChild(e,n){const i=this.resolveIndex_(e);return i?i.inorderTraversal(s=>n(s.name,s.node)):this.children_.inorderTraversal(n)}getIterator(e){return this.getIteratorFrom(e.minPost(),e)}getIteratorFrom(e,n){const i=this.resolveIndex_(n);if(i)return i.getIteratorFrom(e,s=>s);{const s=this.children_.getIteratorFrom(e.name,C.Wrap);let r=s.peek();for(;r!=null&&n.compare(r,e)<0;)s.getNext(),r=s.peek();return s}}getReverseIterator(e){return this.getReverseIteratorFrom(e.maxPost(),e)}getReverseIteratorFrom(e,n){const i=this.resolveIndex_(n);if(i)return i.getReverseIteratorFrom(e,s=>s);{const s=this.children_.getReverseIteratorFrom(e.name,C.Wrap);let r=s.peek();for(;r!=null&&n.compare(r,e)>0;)s.getNext(),r=s.peek();return s}}compareTo(e){return this.isEmpty()?e.isEmpty()?0:-1:e.isLeafNode()||e.isEmpty()?1:e===Ut?-1:0}withIndex(e){if(e===Je||this.indexMap_.hasIndex(e))return this;{const n=this.indexMap_.addIndex(e,this.children_);return new m(this.children_,this.priorityNode_,n)}}isIndexed(e){return e===Je||this.indexMap_.hasIndex(e)}equals(e){if(e===this)return!0;if(e.isLeafNode())return!1;{const n=e;if(this.getPriority().equals(n.getPriority()))if(this.children_.count()===n.children_.count()){const i=this.getIterator(R),s=n.getIterator(R);let r=i.getNext(),o=s.getNext();for(;r&&o;){if(r.name!==o.name||!r.node.equals(o.node))return!1;r=i.getNext(),o=s.getNext()}return r===null&&o===null}else return!1;else return!1}}resolveIndex_(e){return e===Je?null:this.indexMap_.get(e.toString())}}m.INTEGER_REGEXP_=/^(0|[1-9]\d*)$/;class jh extends m{constructor(){super(new G(Ki),m.EMPTY_NODE,de.Default)}compareTo(e){return e===this?0:1}equals(e){return e===this}getPriority(){return this}getImmediateChild(e){return m.EMPTY_NODE}isEmpty(){return!1}}const Ut=new jh;Object.defineProperties(C,{MIN:{value:new C(nt,m.EMPTY_NODE)},MAX:{value:new C(Ve,Ut)}});Zo.__EMPTY_NODE=m.EMPTY_NODE;M.__childrenNodeConstructor=m;Vh(Ut);Wh(Ut);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qh=!0;function P(t,e=null){if(t===null)return m.EMPTY_NODE;if(typeof t=="object"&&".priority"in t&&(e=t[".priority"]),_(e===null||typeof e=="string"||typeof e=="number"||typeof e=="object"&&".sv"in e,"Invalid priority type found: "+typeof e),typeof t=="object"&&".value"in t&&t[".value"]!==null&&(t=t[".value"]),typeof t!="object"||".sv"in t){const n=t;return new M(n,P(e))}if(!(t instanceof Array)&&qh){const n=[];let i=!1;if(B(t,(o,a)=>{if(o.substring(0,1)!=="."){const l=P(a);l.isEmpty()||(i=i||!l.getPriority().isEmpty(),n.push(new C(o,l)))}}),n.length===0)return m.EMPTY_NODE;const r=ln(n,Bh,o=>o.name,Ki);if(i){const o=ln(n,R.getCompare());return new m(r,P(e),new de({".priority":o},{".priority":R}))}else return new m(r,P(e),de.Default)}else{let n=m.EMPTY_NODE;return B(t,(i,s)=>{if(ce(t,i)&&i.substring(0,1)!=="."){const r=P(s);(r.isLeafNode()||!r.isEmpty())&&(n=n.updateImmediateChild(i,r))}}),n.updatePriority(P(e))}}$h(P);/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gh extends Nn{constructor(e){super(),this.indexPath_=e,_(!y(e)&&v(e)!==".priority","Can't create PathIndex with empty path or .priority key")}extractChild(e){return e.getChild(this.indexPath_)}isDefinedOn(e){return!e.getChild(this.indexPath_).isEmpty()}compare(e,n){const i=this.extractChild(e.node),s=this.extractChild(n.node),r=i.compareTo(s);return r===0?je(e.name,n.name):r}makePost(e,n){const i=P(e),s=m.EMPTY_NODE.updateChild(this.indexPath_,i);return new C(n,s)}maxPost(){const e=m.EMPTY_NODE.updateChild(this.indexPath_,Ut);return new C(Ve,e)}toString(){return At(this.indexPath_,0).join("/")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Yh extends Nn{compare(e,n){const i=e.node.compareTo(n.node);return i===0?je(e.name,n.name):i}isDefinedOn(e){return!0}indexedValueChanged(e,n){return!e.equals(n)}minPost(){return C.MIN}maxPost(){return C.MAX}makePost(e,n){const i=P(e);return new C(n,i)}toString(){return".value"}}const Kh=new Yh;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function sa(t){return{type:"value",snapshotNode:t}}function it(t,e){return{type:"child_added",snapshotNode:e,childName:t}}function Rt(t,e){return{type:"child_removed",snapshotNode:e,childName:t}}function Pt(t,e,n){return{type:"child_changed",snapshotNode:e,childName:t,oldSnap:n}}function Qh(t,e){return{type:"child_moved",snapshotNode:e,childName:t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qi{constructor(e){this.index_=e}updateChild(e,n,i,s,r,o){_(e.isIndexed(this.index_),"A node must be indexed if only a child is updated");const a=e.getImmediateChild(n);return a.getChild(s).equals(i.getChild(s))&&a.isEmpty()===i.isEmpty()||(o!=null&&(i.isEmpty()?e.hasChild(n)?o.trackChildChange(Rt(n,a)):_(e.isLeafNode(),"A child remove without an old child only makes sense on a leaf node"):a.isEmpty()?o.trackChildChange(it(n,i)):o.trackChildChange(Pt(n,i,a))),e.isLeafNode()&&i.isEmpty())?e:e.updateImmediateChild(n,i).withIndex(this.index_)}updateFullNode(e,n,i){return i!=null&&(e.isLeafNode()||e.forEachChild(R,(s,r)=>{n.hasChild(s)||i.trackChildChange(Rt(s,r))}),n.isLeafNode()||n.forEachChild(R,(s,r)=>{if(e.hasChild(s)){const o=e.getImmediateChild(s);o.equals(r)||i.trackChildChange(Pt(s,r,o))}else i.trackChildChange(it(s,r))})),n.withIndex(this.index_)}updatePriority(e,n){return e.isEmpty()?m.EMPTY_NODE:e.updatePriority(n)}filtersNodes(){return!1}getIndexedFilter(){return this}getIndex(){return this.index_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dt{constructor(e){this.indexedFilter_=new Qi(e.getIndex()),this.index_=e.getIndex(),this.startPost_=Dt.getStartPost_(e),this.endPost_=Dt.getEndPost_(e),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}getStartPost(){return this.startPost_}getEndPost(){return this.endPost_}matches(e){const n=this.startIsInclusive_?this.index_.compare(this.getStartPost(),e)<=0:this.index_.compare(this.getStartPost(),e)<0,i=this.endIsInclusive_?this.index_.compare(e,this.getEndPost())<=0:this.index_.compare(e,this.getEndPost())<0;return n&&i}updateChild(e,n,i,s,r,o){return this.matches(new C(n,i))||(i=m.EMPTY_NODE),this.indexedFilter_.updateChild(e,n,i,s,r,o)}updateFullNode(e,n,i){n.isLeafNode()&&(n=m.EMPTY_NODE);let s=n.withIndex(this.index_);s=s.updatePriority(m.EMPTY_NODE);const r=this;return n.forEachChild(R,(o,a)=>{r.matches(new C(o,a))||(s=s.updateImmediateChild(o,m.EMPTY_NODE))}),this.indexedFilter_.updateFullNode(e,s,i)}updatePriority(e,n){return e}filtersNodes(){return!0}getIndexedFilter(){return this.indexedFilter_}getIndex(){return this.index_}static getStartPost_(e){if(e.hasStart()){const n=e.getIndexStartName();return e.getIndex().makePost(e.getIndexStartValue(),n)}else return e.getIndex().minPost()}static getEndPost_(e){if(e.hasEnd()){const n=e.getIndexEndName();return e.getIndex().makePost(e.getIndexEndValue(),n)}else return e.getIndex().maxPost()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xh{constructor(e){this.withinDirectionalStart=n=>this.reverse_?this.withinEndPost(n):this.withinStartPost(n),this.withinDirectionalEnd=n=>this.reverse_?this.withinStartPost(n):this.withinEndPost(n),this.withinStartPost=n=>{const i=this.index_.compare(this.rangedFilter_.getStartPost(),n);return this.startIsInclusive_?i<=0:i<0},this.withinEndPost=n=>{const i=this.index_.compare(n,this.rangedFilter_.getEndPost());return this.endIsInclusive_?i<=0:i<0},this.rangedFilter_=new Dt(e),this.index_=e.getIndex(),this.limit_=e.getLimit(),this.reverse_=!e.isViewFromLeft(),this.startIsInclusive_=!e.startAfterSet_,this.endIsInclusive_=!e.endBeforeSet_}updateChild(e,n,i,s,r,o){return this.rangedFilter_.matches(new C(n,i))||(i=m.EMPTY_NODE),e.getImmediateChild(n).equals(i)?e:e.numChildren()<this.limit_?this.rangedFilter_.getIndexedFilter().updateChild(e,n,i,s,r,o):this.fullLimitUpdateChild_(e,n,i,r,o)}updateFullNode(e,n,i){let s;if(n.isLeafNode()||n.isEmpty())s=m.EMPTY_NODE.withIndex(this.index_);else if(this.limit_*2<n.numChildren()&&n.isIndexed(this.index_)){s=m.EMPTY_NODE.withIndex(this.index_);let r;this.reverse_?r=n.getReverseIteratorFrom(this.rangedFilter_.getEndPost(),this.index_):r=n.getIteratorFrom(this.rangedFilter_.getStartPost(),this.index_);let o=0;for(;r.hasNext()&&o<this.limit_;){const a=r.getNext();if(this.withinDirectionalStart(a))if(this.withinDirectionalEnd(a))s=s.updateImmediateChild(a.name,a.node),o++;else break;else continue}}else{s=n.withIndex(this.index_),s=s.updatePriority(m.EMPTY_NODE);let r;this.reverse_?r=s.getReverseIterator(this.index_):r=s.getIterator(this.index_);let o=0;for(;r.hasNext();){const a=r.getNext();o<this.limit_&&this.withinDirectionalStart(a)&&this.withinDirectionalEnd(a)?o++:s=s.updateImmediateChild(a.name,m.EMPTY_NODE)}}return this.rangedFilter_.getIndexedFilter().updateFullNode(e,s,i)}updatePriority(e,n){return e}filtersNodes(){return!0}getIndexedFilter(){return this.rangedFilter_.getIndexedFilter()}getIndex(){return this.index_}fullLimitUpdateChild_(e,n,i,s,r){let o;if(this.reverse_){const d=this.index_.getCompare();o=(h,f)=>d(f,h)}else o=this.index_.getCompare();const a=e;_(a.numChildren()===this.limit_,"");const l=new C(n,i),c=this.reverse_?a.getFirstChild(this.index_):a.getLastChild(this.index_),u=this.rangedFilter_.matches(l);if(a.hasChild(n)){const d=a.getImmediateChild(n);let h=s.getChildAfterChild(this.index_,c,this.reverse_);for(;h!=null&&(h.name===n||a.hasChild(h.name));)h=s.getChildAfterChild(this.index_,h,this.reverse_);const f=h==null?1:o(h,l);if(u&&!i.isEmpty()&&f>=0)return r!=null&&r.trackChildChange(Pt(n,i,d)),a.updateImmediateChild(n,i);{r!=null&&r.trackChildChange(Rt(n,d));const b=a.updateImmediateChild(n,m.EMPTY_NODE);return h!=null&&this.rangedFilter_.matches(h)?(r!=null&&r.trackChildChange(it(h.name,h.node)),b.updateImmediateChild(h.name,h.node)):b}}else return i.isEmpty()?e:u&&o(c,l)>=0?(r!=null&&(r.trackChildChange(Rt(c.name,c.node)),r.trackChildChange(it(n,i))),a.updateImmediateChild(n,i).updateImmediateChild(c.name,m.EMPTY_NODE)):e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xi{constructor(){this.limitSet_=!1,this.startSet_=!1,this.startNameSet_=!1,this.startAfterSet_=!1,this.endSet_=!1,this.endNameSet_=!1,this.endBeforeSet_=!1,this.limit_=0,this.viewFrom_="",this.indexStartValue_=null,this.indexStartName_="",this.indexEndValue_=null,this.indexEndName_="",this.index_=R}hasStart(){return this.startSet_}isViewFromLeft(){return this.viewFrom_===""?this.startSet_:this.viewFrom_==="l"}getIndexStartValue(){return _(this.startSet_,"Only valid if start has been set"),this.indexStartValue_}getIndexStartName(){return _(this.startSet_,"Only valid if start has been set"),this.startNameSet_?this.indexStartName_:nt}hasEnd(){return this.endSet_}getIndexEndValue(){return _(this.endSet_,"Only valid if end has been set"),this.indexEndValue_}getIndexEndName(){return _(this.endSet_,"Only valid if end has been set"),this.endNameSet_?this.indexEndName_:Ve}hasLimit(){return this.limitSet_}hasAnchoredLimit(){return this.limitSet_&&this.viewFrom_!==""}getLimit(){return _(this.limitSet_,"Only valid if limit has been set"),this.limit_}getIndex(){return this.index_}loadsAllData(){return!(this.startSet_||this.endSet_||this.limitSet_)}isDefault(){return this.loadsAllData()&&this.index_===R}copy(){const e=new Xi;return e.limitSet_=this.limitSet_,e.limit_=this.limit_,e.startSet_=this.startSet_,e.startAfterSet_=this.startAfterSet_,e.indexStartValue_=this.indexStartValue_,e.startNameSet_=this.startNameSet_,e.indexStartName_=this.indexStartName_,e.endSet_=this.endSet_,e.endBeforeSet_=this.endBeforeSet_,e.indexEndValue_=this.indexEndValue_,e.endNameSet_=this.endNameSet_,e.indexEndName_=this.indexEndName_,e.index_=this.index_,e.viewFrom_=this.viewFrom_,e}}function Jh(t){return t.loadsAllData()?new Qi(t.getIndex()):t.hasLimit()?new Xh(t):new Dt(t)}function dr(t){const e={};if(t.isDefault())return e;let n;if(t.index_===R?n="$priority":t.index_===Kh?n="$value":t.index_===Je?n="$key":(_(t.index_ instanceof Gh,"Unrecognized index type!"),n=t.index_.toString()),e.orderBy=O(n),t.startSet_){const i=t.startAfterSet_?"startAfter":"startAt";e[i]=O(t.indexStartValue_),t.startNameSet_&&(e[i]+=","+O(t.indexStartName_))}if(t.endSet_){const i=t.endBeforeSet_?"endBefore":"endAt";e[i]=O(t.indexEndValue_),t.endNameSet_&&(e[i]+=","+O(t.indexEndName_))}return t.limitSet_&&(t.isViewFromLeft()?e.limitToFirst=t.limit_:e.limitToLast=t.limit_),e}function hr(t){const e={};if(t.startSet_&&(e.sp=t.indexStartValue_,t.startNameSet_&&(e.sn=t.indexStartName_),e.sin=!t.startAfterSet_),t.endSet_&&(e.ep=t.indexEndValue_,t.endNameSet_&&(e.en=t.indexEndName_),e.ein=!t.endBeforeSet_),t.limitSet_){e.l=t.limit_;let n=t.viewFrom_;n===""&&(t.isViewFromLeft()?n="l":n="r"),e.vf=n}return t.index_!==R&&(e.i=t.index_.toString()),e}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cn extends Ko{reportStats(e){throw new Error("Method not implemented.")}static getListenId_(e,n){return n!==void 0?"tag$"+n:(_(e._queryParams.isDefault(),"should have a tag if it's not a default query."),e._path.toString())}constructor(e,n,i,s){super(),this.repoInfo_=e,this.onDataUpdate_=n,this.authTokenProvider_=i,this.appCheckTokenProvider_=s,this.log_=Wt("p:rest:"),this.listens_={}}listen(e,n,i,s){const r=e._path.toString();this.log_("Listen called for "+r+" "+e._queryIdentifier);const o=cn.getListenId_(e,i),a={};this.listens_[o]=a;const l=dr(e._queryParams);this.restRequest_(r+".json",l,(c,u)=>{let d=u;if(c===404&&(d=null,c=null),c===null&&this.onDataUpdate_(r,d,!1,i),et(this.listens_,o)===a){let h;c?c===401?h="permission_denied":h="rest_error:"+c:h="ok",s(h,null)}})}unlisten(e,n){const i=cn.getListenId_(e,n);delete this.listens_[i]}get(e){const n=dr(e._queryParams),i=e._path.toString(),s=new ae;return this.restRequest_(i+".json",n,(r,o)=>{let a=o;r===404&&(a=null,r=null),r===null?(this.onDataUpdate_(i,a,!1,null),s.resolve(a)):s.reject(new Error(a))}),s.promise}refreshAuthToken(e){}restRequest_(e,n={},i){return n.format="export",Promise.all([this.authTokenProvider_.getToken(!1),this.appCheckTokenProvider_.getToken(!1)]).then(([s,r])=>{s&&s.accessToken&&(n.auth=s.accessToken),r&&r.token&&(n.ac=r.token);const o=(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host+e+"?ns="+this.repoInfo_.namespace+nc(n);this.log_("Sending REST request for "+o);const a=new XMLHttpRequest;a.onreadystatechange=()=>{if(i&&a.readyState===4){this.log_("REST Response for "+o+" received. status:",a.status,"response:",a.responseText);let l=null;if(a.status>=200&&a.status<300){try{l=St(a.responseText)}catch{z("Failed to parse JSON response for "+o+": "+a.responseText)}i(null,l)}else a.status!==401&&a.status!==404&&z("Got unsuccessful REST response for "+o+" Status: "+a.status),i(a.status);i=null}},a.open("GET",o,!0),a.send()})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zh{constructor(){this.rootNode_=m.EMPTY_NODE}getNode(e){return this.rootNode_.getChild(e)}updateSnapshot(e,n){this.rootNode_=this.rootNode_.updateChild(e,n)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function un(){return{value:null,children:new Map}}function ct(t,e,n){if(y(e))t.value=n,t.children.clear();else if(t.value!==null)t.value=t.value.updateChild(e,n);else{const i=v(e);t.children.has(i)||t.children.set(i,un());const s=t.children.get(i);e=S(e),ct(s,e,n)}}function pi(t,e){if(y(e))return t.value=null,t.children.clear(),!0;if(t.value!==null){if(t.value.isLeafNode())return!1;{const n=t.value;return t.value=null,n.forEachChild(R,(i,s)=>{ct(t,new I(i),s)}),pi(t,e)}}else if(t.children.size>0){const n=v(e);return e=S(e),t.children.has(n)&&pi(t.children.get(n),e)&&t.children.delete(n),t.children.size===0}else return!0}function gi(t,e,n){t.value!==null?n(e,t.value):ef(t,(i,s)=>{const r=new I(e.toString()+"/"+i);gi(s,r,n)})}function ef(t,e){t.children.forEach((n,i)=>{e(i,n)})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tf{constructor(e){this.collection_=e,this.last_=null}get(){const e=this.collection_.get(),n=Object.assign({},e);return this.last_&&B(this.last_,(i,s)=>{n[i]=n[i]-s}),this.last_=e,n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const fr=10*1e3,nf=30*1e3,sf=5*60*1e3;class rf{constructor(e,n){this.server_=n,this.statsToReport_={},this.statsListener_=new tf(e);const i=fr+(nf-fr)*Math.random();Ct(this.reportStats_.bind(this),Math.floor(i))}reportStats_(){const e=this.statsListener_.get(),n={};let i=!1;B(e,(s,r)=>{r>0&&ce(this.statsToReport_,s)&&(n[s]=r,i=!0)}),i&&this.server_.reportStats(n),Ct(this.reportStats_.bind(this),Math.floor(Math.random()*2*sf))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var ie;(function(t){t[t.OVERWRITE=0]="OVERWRITE",t[t.MERGE=1]="MERGE",t[t.ACK_USER_WRITE=2]="ACK_USER_WRITE",t[t.LISTEN_COMPLETE=3]="LISTEN_COMPLETE"})(ie||(ie={}));function Ji(){return{fromUser:!0,fromServer:!1,queryId:null,tagged:!1}}function Zi(){return{fromUser:!1,fromServer:!0,queryId:null,tagged:!1}}function es(t){return{fromUser:!1,fromServer:!0,queryId:t,tagged:!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dn{constructor(e,n,i){this.path=e,this.affectedTree=n,this.revert=i,this.type=ie.ACK_USER_WRITE,this.source=Ji()}operationForChild(e){if(y(this.path)){if(this.affectedTree.value!=null)return _(this.affectedTree.children.isEmpty(),"affectedTree should not have overlapping affected paths."),this;{const n=this.affectedTree.subtree(new I(e));return new dn(E(),n,this.revert)}}else return _(v(this.path)===e,"operationForChild called for unrelated child."),new dn(S(this.path),this.affectedTree,this.revert)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xt{constructor(e,n){this.source=e,this.path=n,this.type=ie.LISTEN_COMPLETE}operationForChild(e){return y(this.path)?new xt(this.source,E()):new xt(this.source,S(this.path))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $e{constructor(e,n,i){this.source=e,this.path=n,this.snap=i,this.type=ie.OVERWRITE}operationForChild(e){return y(this.path)?new $e(this.source,E(),this.snap.getImmediateChild(e)):new $e(this.source,S(this.path),this.snap)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class st{constructor(e,n,i){this.source=e,this.path=n,this.children=i,this.type=ie.MERGE}operationForChild(e){if(y(this.path)){const n=this.children.subtree(new I(e));return n.isEmpty()?null:n.value?new $e(this.source,E(),n.value):new st(this.source,E(),n)}else return _(v(this.path)===e,"Can't get a merge for a child not on the path of the operation"),new st(this.source,S(this.path),this.children)}toString(){return"Operation("+this.path+": "+this.source.toString()+" merge: "+this.children.toString()+")"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ke{constructor(e,n,i){this.node_=e,this.fullyInitialized_=n,this.filtered_=i}isFullyInitialized(){return this.fullyInitialized_}isFiltered(){return this.filtered_}isCompleteForPath(e){if(y(e))return this.isFullyInitialized()&&!this.filtered_;const n=v(e);return this.isCompleteForChild(n)}isCompleteForChild(e){return this.isFullyInitialized()&&!this.filtered_||this.node_.hasChild(e)}getNode(){return this.node_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class of{constructor(e){this.query_=e,this.index_=this.query_._queryParams.getIndex()}}function af(t,e,n,i){const s=[],r=[];return e.forEach(o=>{o.type==="child_changed"&&t.index_.indexedValueChanged(o.oldSnap,o.snapshotNode)&&r.push(Qh(o.childName,o.snapshotNode))}),mt(t,s,"child_removed",e,i,n),mt(t,s,"child_added",e,i,n),mt(t,s,"child_moved",r,i,n),mt(t,s,"child_changed",e,i,n),mt(t,s,"value",e,i,n),s}function mt(t,e,n,i,s,r){const o=i.filter(a=>a.type===n);o.sort((a,l)=>cf(t,a,l)),o.forEach(a=>{const l=lf(t,a,r);s.forEach(c=>{c.respondsTo(a.type)&&e.push(c.createEvent(l,t.query_))})})}function lf(t,e,n){return e.type==="value"||e.type==="child_removed"||(e.prevName=n.getPredecessorChildName(e.childName,e.snapshotNode,t.index_)),e}function cf(t,e,n){if(e.childName==null||n.childName==null)throw at("Should only compare child_ events.");const i=new C(e.childName,e.snapshotNode),s=new C(n.childName,n.snapshotNode);return t.index_.compare(i,s)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function An(t,e){return{eventCache:t,serverCache:e}}function bt(t,e,n,i){return An(new ke(e,n,i),t.serverCache)}function ra(t,e,n,i){return An(t.eventCache,new ke(e,n,i))}function hn(t){return t.eventCache.isFullyInitialized()?t.eventCache.getNode():null}function We(t){return t.serverCache.isFullyInitialized()?t.serverCache.getNode():null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Jn;const uf=()=>(Jn||(Jn=new G(Gd)),Jn);class k{static fromObject(e){let n=new k(null);return B(e,(i,s)=>{n=n.set(new I(i),s)}),n}constructor(e,n=uf()){this.value=e,this.children=n}isEmpty(){return this.value===null&&this.children.isEmpty()}findRootMostMatchingPathAndValue(e,n){if(this.value!=null&&n(this.value))return{path:E(),value:this.value};if(y(e))return null;{const i=v(e),s=this.children.get(i);if(s!==null){const r=s.findRootMostMatchingPathAndValue(S(e),n);return r!=null?{path:A(new I(i),r.path),value:r.value}:null}else return null}}findRootMostValueAndPath(e){return this.findRootMostMatchingPathAndValue(e,()=>!0)}subtree(e){if(y(e))return this;{const n=v(e),i=this.children.get(n);return i!==null?i.subtree(S(e)):new k(null)}}set(e,n){if(y(e))return new k(n,this.children);{const i=v(e),r=(this.children.get(i)||new k(null)).set(S(e),n),o=this.children.insert(i,r);return new k(this.value,o)}}remove(e){if(y(e))return this.children.isEmpty()?new k(null):new k(null,this.children);{const n=v(e),i=this.children.get(n);if(i){const s=i.remove(S(e));let r;return s.isEmpty()?r=this.children.remove(n):r=this.children.insert(n,s),this.value===null&&r.isEmpty()?new k(null):new k(this.value,r)}else return this}}get(e){if(y(e))return this.value;{const n=v(e),i=this.children.get(n);return i?i.get(S(e)):null}}setTree(e,n){if(y(e))return n;{const i=v(e),r=(this.children.get(i)||new k(null)).setTree(S(e),n);let o;return r.isEmpty()?o=this.children.remove(i):o=this.children.insert(i,r),new k(this.value,o)}}fold(e){return this.fold_(E(),e)}fold_(e,n){const i={};return this.children.inorderTraversal((s,r)=>{i[s]=r.fold_(A(e,s),n)}),n(e,this.value,i)}findOnPath(e,n){return this.findOnPath_(e,E(),n)}findOnPath_(e,n,i){const s=this.value?i(n,this.value):!1;if(s)return s;if(y(e))return null;{const r=v(e),o=this.children.get(r);return o?o.findOnPath_(S(e),A(n,r),i):null}}foreachOnPath(e,n){return this.foreachOnPath_(e,E(),n)}foreachOnPath_(e,n,i){if(y(e))return this;{this.value&&i(n,this.value);const s=v(e),r=this.children.get(s);return r?r.foreachOnPath_(S(e),A(n,s),i):new k(null)}}foreach(e){this.foreach_(E(),e)}foreach_(e,n){this.children.inorderTraversal((i,s)=>{s.foreach_(A(e,i),n)}),this.value&&n(e,this.value)}foreachChild(e){this.children.inorderTraversal((n,i)=>{i.value&&e(n,i.value)})}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class se{constructor(e){this.writeTree_=e}static empty(){return new se(new k(null))}}function wt(t,e,n){if(y(e))return new se(new k(n));{const i=t.writeTree_.findRootMostValueAndPath(e);if(i!=null){const s=i.path;let r=i.value;const o=H(s,e);return r=r.updateChild(o,n),new se(t.writeTree_.set(s,r))}else{const s=new k(n),r=t.writeTree_.setTree(e,s);return new se(r)}}}function mi(t,e,n){let i=t;return B(n,(s,r)=>{i=wt(i,A(e,s),r)}),i}function _r(t,e){if(y(e))return se.empty();{const n=t.writeTree_.setTree(e,new k(null));return new se(n)}}function vi(t,e){return qe(t,e)!=null}function qe(t,e){const n=t.writeTree_.findRootMostValueAndPath(e);return n!=null?t.writeTree_.get(n.path).getChild(H(n.path,e)):null}function pr(t){const e=[],n=t.writeTree_.value;return n!=null?n.isLeafNode()||n.forEachChild(R,(i,s)=>{e.push(new C(i,s))}):t.writeTree_.children.inorderTraversal((i,s)=>{s.value!=null&&e.push(new C(i,s.value))}),e}function Ee(t,e){if(y(e))return t;{const n=qe(t,e);return n!=null?new se(new k(n)):new se(t.writeTree_.subtree(e))}}function yi(t){return t.writeTree_.isEmpty()}function rt(t,e){return oa(E(),t.writeTree_,e)}function oa(t,e,n){if(e.value!=null)return n.updateChild(t,e.value);{let i=null;return e.children.inorderTraversal((s,r)=>{s===".priority"?(_(r.value!==null,"Priority writes must always be leaf nodes"),i=r.value):n=oa(A(t,s),r,n)}),!n.getChild(t).isEmpty()&&i!==null&&(n=n.updateChild(A(t,".priority"),i)),n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rn(t,e){return ua(e,t)}function df(t,e,n,i,s){_(i>t.lastWriteId,"Stacking an older write on top of newer ones"),s===void 0&&(s=!0),t.allWrites.push({path:e,snap:n,writeId:i,visible:s}),s&&(t.visibleWrites=wt(t.visibleWrites,e,n)),t.lastWriteId=i}function hf(t,e,n,i){_(i>t.lastWriteId,"Stacking an older merge on top of newer ones"),t.allWrites.push({path:e,children:n,writeId:i,visible:!0}),t.visibleWrites=mi(t.visibleWrites,e,n),t.lastWriteId=i}function ff(t,e){for(let n=0;n<t.allWrites.length;n++){const i=t.allWrites[n];if(i.writeId===e)return i}return null}function _f(t,e){const n=t.allWrites.findIndex(a=>a.writeId===e);_(n>=0,"removeWrite called with nonexistent writeId.");const i=t.allWrites[n];t.allWrites.splice(n,1);let s=i.visible,r=!1,o=t.allWrites.length-1;for(;s&&o>=0;){const a=t.allWrites[o];a.visible&&(o>=n&&pf(a,i.path)?s=!1:J(i.path,a.path)&&(r=!0)),o--}if(s){if(r)return gf(t),!0;if(i.snap)t.visibleWrites=_r(t.visibleWrites,i.path);else{const a=i.children;B(a,l=>{t.visibleWrites=_r(t.visibleWrites,A(i.path,l))})}return!0}else return!1}function pf(t,e){if(t.snap)return J(t.path,e);for(const n in t.children)if(t.children.hasOwnProperty(n)&&J(A(t.path,n),e))return!0;return!1}function gf(t){t.visibleWrites=aa(t.allWrites,mf,E()),t.allWrites.length>0?t.lastWriteId=t.allWrites[t.allWrites.length-1].writeId:t.lastWriteId=-1}function mf(t){return t.visible}function aa(t,e,n){let i=se.empty();for(let s=0;s<t.length;++s){const r=t[s];if(e(r)){const o=r.path;let a;if(r.snap)J(n,o)?(a=H(n,o),i=wt(i,a,r.snap)):J(o,n)&&(a=H(o,n),i=wt(i,E(),r.snap.getChild(a)));else if(r.children){if(J(n,o))a=H(n,o),i=mi(i,a,r.children);else if(J(o,n))if(a=H(o,n),y(a))i=mi(i,E(),r.children);else{const l=et(r.children,v(a));if(l){const c=l.getChild(S(a));i=wt(i,E(),c)}}}else throw at("WriteRecord should have .snap or .children")}}return i}function la(t,e,n,i,s){if(!i&&!s){const r=qe(t.visibleWrites,e);if(r!=null)return r;{const o=Ee(t.visibleWrites,e);if(yi(o))return n;if(n==null&&!vi(o,E()))return null;{const a=n||m.EMPTY_NODE;return rt(o,a)}}}else{const r=Ee(t.visibleWrites,e);if(!s&&yi(r))return n;if(!s&&n==null&&!vi(r,E()))return null;{const o=function(c){return(c.visible||s)&&(!i||!~i.indexOf(c.writeId))&&(J(c.path,e)||J(e,c.path))},a=aa(t.allWrites,o,e),l=n||m.EMPTY_NODE;return rt(a,l)}}}function vf(t,e,n){let i=m.EMPTY_NODE;const s=qe(t.visibleWrites,e);if(s)return s.isLeafNode()||s.forEachChild(R,(r,o)=>{i=i.updateImmediateChild(r,o)}),i;if(n){const r=Ee(t.visibleWrites,e);return n.forEachChild(R,(o,a)=>{const l=rt(Ee(r,new I(o)),a);i=i.updateImmediateChild(o,l)}),pr(r).forEach(o=>{i=i.updateImmediateChild(o.name,o.node)}),i}else{const r=Ee(t.visibleWrites,e);return pr(r).forEach(o=>{i=i.updateImmediateChild(o.name,o.node)}),i}}function yf(t,e,n,i,s){_(i||s,"Either existingEventSnap or existingServerSnap must exist");const r=A(e,n);if(vi(t.visibleWrites,r))return null;{const o=Ee(t.visibleWrites,r);return yi(o)?s.getChild(n):rt(o,s.getChild(n))}}function Cf(t,e,n,i){const s=A(e,n),r=qe(t.visibleWrites,s);if(r!=null)return r;if(i.isCompleteForChild(n)){const o=Ee(t.visibleWrites,s);return rt(o,i.getNode().getImmediateChild(n))}else return null}function bf(t,e){return qe(t.visibleWrites,e)}function wf(t,e,n,i,s,r,o){let a;const l=Ee(t.visibleWrites,e),c=qe(l,E());if(c!=null)a=c;else if(n!=null)a=rt(l,n);else return[];if(a=a.withIndex(o),!a.isEmpty()&&!a.isLeafNode()){const u=[],d=o.getCompare(),h=r?a.getReverseIteratorFrom(i,o):a.getIteratorFrom(i,o);let f=h.getNext();for(;f&&u.length<s;)d(f,i)!==0&&u.push(f),f=h.getNext();return u}else return[]}function Ef(){return{visibleWrites:se.empty(),allWrites:[],lastWriteId:-1}}function fn(t,e,n,i){return la(t.writeTree,t.treePath,e,n,i)}function ts(t,e){return vf(t.writeTree,t.treePath,e)}function gr(t,e,n,i){return yf(t.writeTree,t.treePath,e,n,i)}function _n(t,e){return bf(t.writeTree,A(t.treePath,e))}function If(t,e,n,i,s,r){return wf(t.writeTree,t.treePath,e,n,i,s,r)}function ns(t,e,n){return Cf(t.writeTree,t.treePath,e,n)}function ca(t,e){return ua(A(t.treePath,e),t.writeTree)}function ua(t,e){return{treePath:t,writeTree:e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sf{constructor(){this.changeMap=new Map}trackChildChange(e){const n=e.type,i=e.childName;_(n==="child_added"||n==="child_changed"||n==="child_removed","Only child changes supported for tracking"),_(i!==".priority","Only non-priority child changes can be tracked.");const s=this.changeMap.get(i);if(s){const r=s.type;if(n==="child_added"&&r==="child_removed")this.changeMap.set(i,Pt(i,e.snapshotNode,s.snapshotNode));else if(n==="child_removed"&&r==="child_added")this.changeMap.delete(i);else if(n==="child_removed"&&r==="child_changed")this.changeMap.set(i,Rt(i,s.oldSnap));else if(n==="child_changed"&&r==="child_added")this.changeMap.set(i,it(i,e.snapshotNode));else if(n==="child_changed"&&r==="child_changed")this.changeMap.set(i,Pt(i,e.snapshotNode,s.oldSnap));else throw at("Illegal combination of changes: "+e+" occurred after "+s)}else this.changeMap.set(i,e)}getChanges(){return Array.from(this.changeMap.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tf{getCompleteChild(e){return null}getChildAfterChild(e,n,i){return null}}const da=new Tf;class is{constructor(e,n,i=null){this.writes_=e,this.viewCache_=n,this.optCompleteServerCache_=i}getCompleteChild(e){const n=this.viewCache_.eventCache;if(n.isCompleteForChild(e))return n.getNode().getImmediateChild(e);{const i=this.optCompleteServerCache_!=null?new ke(this.optCompleteServerCache_,!0,!1):this.viewCache_.serverCache;return ns(this.writes_,e,i)}}getChildAfterChild(e,n,i){const s=this.optCompleteServerCache_!=null?this.optCompleteServerCache_:We(this.viewCache_),r=If(this.writes_,s,n,1,i,e);return r.length===0?null:r[0]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kf(t){return{filter:t}}function Nf(t,e){_(e.eventCache.getNode().isIndexed(t.filter.getIndex()),"Event snap not indexed"),_(e.serverCache.getNode().isIndexed(t.filter.getIndex()),"Server snap not indexed")}function Af(t,e,n,i,s){const r=new Sf;let o,a;if(n.type===ie.OVERWRITE){const c=n;c.source.fromUser?o=Ci(t,e,c.path,c.snap,i,s,r):(_(c.source.fromServer,"Unknown source."),a=c.source.tagged||e.serverCache.isFiltered()&&!y(c.path),o=pn(t,e,c.path,c.snap,i,s,a,r))}else if(n.type===ie.MERGE){const c=n;c.source.fromUser?o=Pf(t,e,c.path,c.children,i,s,r):(_(c.source.fromServer,"Unknown source."),a=c.source.tagged||e.serverCache.isFiltered(),o=bi(t,e,c.path,c.children,i,s,a,r))}else if(n.type===ie.ACK_USER_WRITE){const c=n;c.revert?o=Of(t,e,c.path,i,s,r):o=Df(t,e,c.path,c.affectedTree,i,s,r)}else if(n.type===ie.LISTEN_COMPLETE)o=xf(t,e,n.path,i,r);else throw at("Unknown operation type: "+n.type);const l=r.getChanges();return Rf(e,o,l),{viewCache:o,changes:l}}function Rf(t,e,n){const i=e.eventCache;if(i.isFullyInitialized()){const s=i.getNode().isLeafNode()||i.getNode().isEmpty(),r=hn(t);(n.length>0||!t.eventCache.isFullyInitialized()||s&&!i.getNode().equals(r)||!i.getNode().getPriority().equals(r.getPriority()))&&n.push(sa(hn(e)))}}function ha(t,e,n,i,s,r){const o=e.eventCache;if(_n(i,n)!=null)return e;{let a,l;if(y(n))if(_(e.serverCache.isFullyInitialized(),"If change path is empty, we must have complete server data"),e.serverCache.isFiltered()){const c=We(e),u=c instanceof m?c:m.EMPTY_NODE,d=ts(i,u);a=t.filter.updateFullNode(e.eventCache.getNode(),d,r)}else{const c=fn(i,We(e));a=t.filter.updateFullNode(e.eventCache.getNode(),c,r)}else{const c=v(n);if(c===".priority"){_(Te(n)===1,"Can't have a priority with additional path components");const u=o.getNode();l=e.serverCache.getNode();const d=gr(i,n,u,l);d!=null?a=t.filter.updatePriority(u,d):a=o.getNode()}else{const u=S(n);let d;if(o.isCompleteForChild(c)){l=e.serverCache.getNode();const h=gr(i,n,o.getNode(),l);h!=null?d=o.getNode().getImmediateChild(c).updateChild(u,h):d=o.getNode().getImmediateChild(c)}else d=ns(i,c,e.serverCache);d!=null?a=t.filter.updateChild(o.getNode(),c,d,u,s,r):a=o.getNode()}}return bt(e,a,o.isFullyInitialized()||y(n),t.filter.filtersNodes())}}function pn(t,e,n,i,s,r,o,a){const l=e.serverCache;let c;const u=o?t.filter:t.filter.getIndexedFilter();if(y(n))c=u.updateFullNode(l.getNode(),i,null);else if(u.filtersNodes()&&!l.isFiltered()){const f=l.getNode().updateChild(n,i);c=u.updateFullNode(l.getNode(),f,null)}else{const f=v(n);if(!l.isCompleteForPath(n)&&Te(n)>1)return e;const p=S(n),T=l.getNode().getImmediateChild(f).updateChild(p,i);f===".priority"?c=u.updatePriority(l.getNode(),T):c=u.updateChild(l.getNode(),f,T,p,da,null)}const d=ra(e,c,l.isFullyInitialized()||y(n),u.filtersNodes()),h=new is(s,d,r);return ha(t,d,n,s,h,a)}function Ci(t,e,n,i,s,r,o){const a=e.eventCache;let l,c;const u=new is(s,e,r);if(y(n))c=t.filter.updateFullNode(e.eventCache.getNode(),i,o),l=bt(e,c,!0,t.filter.filtersNodes());else{const d=v(n);if(d===".priority")c=t.filter.updatePriority(e.eventCache.getNode(),i),l=bt(e,c,a.isFullyInitialized(),a.isFiltered());else{const h=S(n),f=a.getNode().getImmediateChild(d);let p;if(y(h))p=i;else{const b=u.getCompleteChild(d);b!=null?qi(h)===".priority"&&b.getChild(Xo(h)).isEmpty()?p=b:p=b.updateChild(h,i):p=m.EMPTY_NODE}if(f.equals(p))l=e;else{const b=t.filter.updateChild(a.getNode(),d,p,h,u,o);l=bt(e,b,a.isFullyInitialized(),t.filter.filtersNodes())}}}return l}function mr(t,e){return t.eventCache.isCompleteForChild(e)}function Pf(t,e,n,i,s,r,o){let a=e;return i.foreach((l,c)=>{const u=A(n,l);mr(e,v(u))&&(a=Ci(t,a,u,c,s,r,o))}),i.foreach((l,c)=>{const u=A(n,l);mr(e,v(u))||(a=Ci(t,a,u,c,s,r,o))}),a}function vr(t,e,n){return n.foreach((i,s)=>{e=e.updateChild(i,s)}),e}function bi(t,e,n,i,s,r,o,a){if(e.serverCache.getNode().isEmpty()&&!e.serverCache.isFullyInitialized())return e;let l=e,c;y(n)?c=i:c=new k(null).setTree(n,i);const u=e.serverCache.getNode();return c.children.inorderTraversal((d,h)=>{if(u.hasChild(d)){const f=e.serverCache.getNode().getImmediateChild(d),p=vr(t,f,h);l=pn(t,l,new I(d),p,s,r,o,a)}}),c.children.inorderTraversal((d,h)=>{const f=!e.serverCache.isCompleteForChild(d)&&h.value===null;if(!u.hasChild(d)&&!f){const p=e.serverCache.getNode().getImmediateChild(d),b=vr(t,p,h);l=pn(t,l,new I(d),b,s,r,o,a)}}),l}function Df(t,e,n,i,s,r,o){if(_n(s,n)!=null)return e;const a=e.serverCache.isFiltered(),l=e.serverCache;if(i.value!=null){if(y(n)&&l.isFullyInitialized()||l.isCompleteForPath(n))return pn(t,e,n,l.getNode().getChild(n),s,r,a,o);if(y(n)){let c=new k(null);return l.getNode().forEachChild(Je,(u,d)=>{c=c.set(new I(u),d)}),bi(t,e,n,c,s,r,a,o)}else return e}else{let c=new k(null);return i.foreach((u,d)=>{const h=A(n,u);l.isCompleteForPath(h)&&(c=c.set(u,l.getNode().getChild(h)))}),bi(t,e,n,c,s,r,a,o)}}function xf(t,e,n,i,s){const r=e.serverCache,o=ra(e,r.getNode(),r.isFullyInitialized()||y(n),r.isFiltered());return ha(t,o,n,i,da,s)}function Of(t,e,n,i,s,r){let o;if(_n(i,n)!=null)return e;{const a=new is(i,e,s),l=e.eventCache.getNode();let c;if(y(n)||v(n)===".priority"){let u;if(e.serverCache.isFullyInitialized())u=fn(i,We(e));else{const d=e.serverCache.getNode();_(d instanceof m,"serverChildren would be complete if leaf node"),u=ts(i,d)}u=u,c=t.filter.updateFullNode(l,u,r)}else{const u=v(n);let d=ns(i,u,e.serverCache);d==null&&e.serverCache.isCompleteForChild(u)&&(d=l.getImmediateChild(u)),d!=null?c=t.filter.updateChild(l,u,d,S(n),a,r):e.eventCache.getNode().hasChild(u)?c=t.filter.updateChild(l,u,m.EMPTY_NODE,S(n),a,r):c=l,c.isEmpty()&&e.serverCache.isFullyInitialized()&&(o=fn(i,We(e)),o.isLeafNode()&&(c=t.filter.updateFullNode(c,o,r)))}return o=e.serverCache.isFullyInitialized()||_n(i,E())!=null,bt(e,c,o,t.filter.filtersNodes())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mf{constructor(e,n){this.query_=e,this.eventRegistrations_=[];const i=this.query_._queryParams,s=new Qi(i.getIndex()),r=Jh(i);this.processor_=kf(r);const o=n.serverCache,a=n.eventCache,l=s.updateFullNode(m.EMPTY_NODE,o.getNode(),null),c=r.updateFullNode(m.EMPTY_NODE,a.getNode(),null),u=new ke(l,o.isFullyInitialized(),s.filtersNodes()),d=new ke(c,a.isFullyInitialized(),r.filtersNodes());this.viewCache_=An(d,u),this.eventGenerator_=new of(this.query_)}get query(){return this.query_}}function Lf(t){return t.viewCache_.serverCache.getNode()}function Ff(t){return hn(t.viewCache_)}function Bf(t,e){const n=We(t.viewCache_);return n&&(t.query._queryParams.loadsAllData()||!y(e)&&!n.getImmediateChild(v(e)).isEmpty())?n.getChild(e):null}function yr(t){return t.eventRegistrations_.length===0}function Vf(t,e){t.eventRegistrations_.push(e)}function Cr(t,e,n){const i=[];if(n){_(e==null,"A cancel should cancel all event registrations.");const s=t.query._path;t.eventRegistrations_.forEach(r=>{const o=r.createCancelEvent(n,s);o&&i.push(o)})}if(e){let s=[];for(let r=0;r<t.eventRegistrations_.length;++r){const o=t.eventRegistrations_[r];if(!o.matches(e))s.push(o);else if(e.hasAnyCallback()){s=s.concat(t.eventRegistrations_.slice(r+1));break}}t.eventRegistrations_=s}else t.eventRegistrations_=[];return i}function br(t,e,n,i){e.type===ie.MERGE&&e.source.queryId!==null&&(_(We(t.viewCache_),"We should always have a full cache before handling merges"),_(hn(t.viewCache_),"Missing event cache, even though we have a server cache"));const s=t.viewCache_,r=Af(t.processor_,s,e,n,i);return Nf(t.processor_,r.viewCache),_(r.viewCache.serverCache.isFullyInitialized()||!s.serverCache.isFullyInitialized(),"Once a server snap is complete, it should never go back"),t.viewCache_=r.viewCache,fa(t,r.changes,r.viewCache.eventCache.getNode(),null)}function $f(t,e){const n=t.viewCache_.eventCache,i=[];return n.getNode().isLeafNode()||n.getNode().forEachChild(R,(r,o)=>{i.push(it(r,o))}),n.isFullyInitialized()&&i.push(sa(n.getNode())),fa(t,i,n.getNode(),e)}function fa(t,e,n,i){const s=i?[i]:t.eventRegistrations_;return af(t.eventGenerator_,e,n,s)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let gn;class _a{constructor(){this.views=new Map}}function Wf(t){_(!gn,"__referenceConstructor has already been defined"),gn=t}function Uf(){return _(gn,"Reference.ts has not been loaded"),gn}function Hf(t){return t.views.size===0}function ss(t,e,n,i){const s=e.source.queryId;if(s!==null){const r=t.views.get(s);return _(r!=null,"SyncTree gave us an op for an invalid query."),br(r,e,n,i)}else{let r=[];for(const o of t.views.values())r=r.concat(br(o,e,n,i));return r}}function pa(t,e,n,i,s){const r=e._queryIdentifier,o=t.views.get(r);if(!o){let a=fn(n,s?i:null),l=!1;a?l=!0:i instanceof m?(a=ts(n,i),l=!1):(a=m.EMPTY_NODE,l=!1);const c=An(new ke(a,l,!1),new ke(i,s,!1));return new Mf(e,c)}return o}function zf(t,e,n,i,s,r){const o=pa(t,e,i,s,r);return t.views.has(e._queryIdentifier)||t.views.set(e._queryIdentifier,o),Vf(o,n),$f(o,n)}function jf(t,e,n,i){const s=e._queryIdentifier,r=[];let o=[];const a=Ne(t);if(s==="default")for(const[l,c]of t.views.entries())o=o.concat(Cr(c,n,i)),yr(c)&&(t.views.delete(l),c.query._queryParams.loadsAllData()||r.push(c.query));else{const l=t.views.get(s);l&&(o=o.concat(Cr(l,n,i)),yr(l)&&(t.views.delete(s),l.query._queryParams.loadsAllData()||r.push(l.query)))}return a&&!Ne(t)&&r.push(new(Uf())(e._repo,e._path)),{removed:r,events:o}}function ga(t){const e=[];for(const n of t.views.values())n.query._queryParams.loadsAllData()||e.push(n);return e}function Ie(t,e){let n=null;for(const i of t.views.values())n=n||Bf(i,e);return n}function ma(t,e){if(e._queryParams.loadsAllData())return Pn(t);{const i=e._queryIdentifier;return t.views.get(i)}}function va(t,e){return ma(t,e)!=null}function Ne(t){return Pn(t)!=null}function Pn(t){for(const e of t.views.values())if(e.query._queryParams.loadsAllData())return e;return null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let mn;function qf(t){_(!mn,"__referenceConstructor has already been defined"),mn=t}function Gf(){return _(mn,"Reference.ts has not been loaded"),mn}let Yf=1;class wr{constructor(e){this.listenProvider_=e,this.syncPointTree_=new k(null),this.pendingWriteTree_=Ef(),this.tagToQueryMap=new Map,this.queryToTagMap=new Map}}function ya(t,e,n,i,s){return df(t.pendingWriteTree_,e,n,i,s),s?ut(t,new $e(Ji(),e,n)):[]}function Kf(t,e,n,i){hf(t.pendingWriteTree_,e,n,i);const s=k.fromObject(n);return ut(t,new st(Ji(),e,s))}function Ce(t,e,n=!1){const i=ff(t.pendingWriteTree_,e);if(_f(t.pendingWriteTree_,e)){let r=new k(null);return i.snap!=null?r=r.set(E(),!0):B(i.children,o=>{r=r.set(new I(o),!0)}),ut(t,new dn(i.path,r,n))}else return[]}function Ht(t,e,n){return ut(t,new $e(Zi(),e,n))}function Qf(t,e,n){const i=k.fromObject(n);return ut(t,new st(Zi(),e,i))}function Xf(t,e){return ut(t,new xt(Zi(),e))}function Jf(t,e,n){const i=os(t,n);if(i){const s=as(i),r=s.path,o=s.queryId,a=H(r,e),l=new xt(es(o),a);return ls(t,r,l)}else return[]}function vn(t,e,n,i,s=!1){const r=e._path,o=t.syncPointTree_.get(r);let a=[];if(o&&(e._queryIdentifier==="default"||va(o,e))){const l=jf(o,e,n,i);Hf(o)&&(t.syncPointTree_=t.syncPointTree_.remove(r));const c=l.removed;if(a=l.events,!s){const u=c.findIndex(h=>h._queryParams.loadsAllData())!==-1,d=t.syncPointTree_.findOnPath(r,(h,f)=>Ne(f));if(u&&!d){const h=t.syncPointTree_.subtree(r);if(!h.isEmpty()){const f=t_(h);for(let p=0;p<f.length;++p){const b=f[p],T=b.query,W=Ea(t,b);t.listenProvider_.startListening(Et(T),Ot(t,T),W.hashFn,W.onComplete)}}}!d&&c.length>0&&!i&&(u?t.listenProvider_.stopListening(Et(e),null):c.forEach(h=>{const f=t.queryToTagMap.get(Dn(h));t.listenProvider_.stopListening(Et(h),f)}))}n_(t,c)}return a}function Ca(t,e,n,i){const s=os(t,i);if(s!=null){const r=as(s),o=r.path,a=r.queryId,l=H(o,e),c=new $e(es(a),l,n);return ls(t,o,c)}else return[]}function Zf(t,e,n,i){const s=os(t,i);if(s){const r=as(s),o=r.path,a=r.queryId,l=H(o,e),c=k.fromObject(n),u=new st(es(a),l,c);return ls(t,o,u)}else return[]}function wi(t,e,n,i=!1){const s=e._path;let r=null,o=!1;t.syncPointTree_.foreachOnPath(s,(h,f)=>{const p=H(h,s);r=r||Ie(f,p),o=o||Ne(f)});let a=t.syncPointTree_.get(s);a?(o=o||Ne(a),r=r||Ie(a,E())):(a=new _a,t.syncPointTree_=t.syncPointTree_.set(s,a));let l;r!=null?l=!0:(l=!1,r=m.EMPTY_NODE,t.syncPointTree_.subtree(s).foreachChild((f,p)=>{const b=Ie(p,E());b&&(r=r.updateImmediateChild(f,b))}));const c=va(a,e);if(!c&&!e._queryParams.loadsAllData()){const h=Dn(e);_(!t.queryToTagMap.has(h),"View does not exist, but we have a tag");const f=i_();t.queryToTagMap.set(h,f),t.tagToQueryMap.set(f,h)}const u=Rn(t.pendingWriteTree_,s);let d=zf(a,e,n,u,r,l);if(!c&&!o&&!i){const h=ma(a,e);d=d.concat(s_(t,e,h))}return d}function rs(t,e,n){const s=t.pendingWriteTree_,r=t.syncPointTree_.findOnPath(e,(o,a)=>{const l=H(o,e),c=Ie(a,l);if(c)return c});return la(s,e,r,n,!0)}function e_(t,e){const n=e._path;let i=null;t.syncPointTree_.foreachOnPath(n,(c,u)=>{const d=H(c,n);i=i||Ie(u,d)});let s=t.syncPointTree_.get(n);s?i=i||Ie(s,E()):(s=new _a,t.syncPointTree_=t.syncPointTree_.set(n,s));const r=i!=null,o=r?new ke(i,!0,!1):null,a=Rn(t.pendingWriteTree_,e._path),l=pa(s,e,a,r?o.getNode():m.EMPTY_NODE,r);return Ff(l)}function ut(t,e){return ba(e,t.syncPointTree_,null,Rn(t.pendingWriteTree_,E()))}function ba(t,e,n,i){if(y(t.path))return wa(t,e,n,i);{const s=e.get(E());n==null&&s!=null&&(n=Ie(s,E()));let r=[];const o=v(t.path),a=t.operationForChild(o),l=e.children.get(o);if(l&&a){const c=n?n.getImmediateChild(o):null,u=ca(i,o);r=r.concat(ba(a,l,c,u))}return s&&(r=r.concat(ss(s,t,i,n))),r}}function wa(t,e,n,i){const s=e.get(E());n==null&&s!=null&&(n=Ie(s,E()));let r=[];return e.children.inorderTraversal((o,a)=>{const l=n?n.getImmediateChild(o):null,c=ca(i,o),u=t.operationForChild(o);u&&(r=r.concat(wa(u,a,l,c)))}),s&&(r=r.concat(ss(s,t,i,n))),r}function Ea(t,e){const n=e.query,i=Ot(t,n);return{hashFn:()=>(Lf(e)||m.EMPTY_NODE).hash(),onComplete:s=>{if(s==="ok")return i?Jf(t,n._path,i):Xf(t,n._path);{const r=Qd(s,n);return vn(t,n,null,r)}}}}function Ot(t,e){const n=Dn(e);return t.queryToTagMap.get(n)}function Dn(t){return t._path.toString()+"$"+t._queryIdentifier}function os(t,e){return t.tagToQueryMap.get(e)}function as(t){const e=t.indexOf("$");return _(e!==-1&&e<t.length-1,"Bad queryKey."),{queryId:t.substr(e+1),path:new I(t.substr(0,e))}}function ls(t,e,n){const i=t.syncPointTree_.get(e);_(i,"Missing sync point for query tag that we're tracking");const s=Rn(t.pendingWriteTree_,e);return ss(i,n,s,null)}function t_(t){return t.fold((e,n,i)=>{if(n&&Ne(n))return[Pn(n)];{let s=[];return n&&(s=ga(n)),B(i,(r,o)=>{s=s.concat(o)}),s}})}function Et(t){return t._queryParams.loadsAllData()&&!t._queryParams.isDefault()?new(Gf())(t._repo,t._path):t}function n_(t,e){for(let n=0;n<e.length;++n){const i=e[n];if(!i._queryParams.loadsAllData()){const s=Dn(i),r=t.queryToTagMap.get(s);t.queryToTagMap.delete(s),t.tagToQueryMap.delete(r)}}}function i_(){return Yf++}function s_(t,e,n){const i=e._path,s=Ot(t,e),r=Ea(t,n),o=t.listenProvider_.startListening(Et(e),s,r.hashFn,r.onComplete),a=t.syncPointTree_.subtree(i);if(s)_(!Ne(a.value),"If we're adding a query, it shouldn't be shadowed");else{const l=a.fold((c,u,d)=>{if(!y(c)&&u&&Ne(u))return[Pn(u).query];{let h=[];return u&&(h=h.concat(ga(u).map(f=>f.query))),B(d,(f,p)=>{h=h.concat(p)}),h}});for(let c=0;c<l.length;++c){const u=l[c];t.listenProvider_.stopListening(Et(u),Ot(t,u))}}return o}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cs{constructor(e){this.node_=e}getImmediateChild(e){const n=this.node_.getImmediateChild(e);return new cs(n)}node(){return this.node_}}class us{constructor(e,n){this.syncTree_=e,this.path_=n}getImmediateChild(e){const n=A(this.path_,e);return new us(this.syncTree_,n)}node(){return rs(this.syncTree_,this.path_)}}const r_=function(t){return t=t||{},t.timestamp=t.timestamp||new Date().getTime(),t},Er=function(t,e,n){if(!t||typeof t!="object")return t;if(_(".sv"in t,"Unexpected leaf node or priority contents"),typeof t[".sv"]=="string")return o_(t[".sv"],e,n);if(typeof t[".sv"]=="object")return a_(t[".sv"],e);_(!1,"Unexpected server value: "+JSON.stringify(t,null,2))},o_=function(t,e,n){switch(t){case"timestamp":return n.timestamp;default:_(!1,"Unexpected server value: "+t)}},a_=function(t,e,n){t.hasOwnProperty("increment")||_(!1,"Unexpected server value: "+JSON.stringify(t,null,2));const i=t.increment;typeof i!="number"&&_(!1,"Unexpected increment value: "+i);const s=e.node();if(_(s!==null&&typeof s<"u","Expected ChildrenNode.EMPTY_NODE for nulls"),!s.isLeafNode())return i;const o=s.getValue();return typeof o!="number"?i:o+i},Ia=function(t,e,n,i){return ds(e,new us(n,t),i)},Sa=function(t,e,n){return ds(t,new cs(e),n)};function ds(t,e,n){const i=t.getPriority().val(),s=Er(i,e.getImmediateChild(".priority"),n);let r;if(t.isLeafNode()){const o=t,a=Er(o.getValue(),e,n);return a!==o.getValue()||s!==o.getPriority().val()?new M(a,P(s)):t}else{const o=t;return r=o,s!==o.getPriority().val()&&(r=r.updatePriority(new M(s))),o.forEachChild(R,(a,l)=>{const c=ds(l,e.getImmediateChild(a),n);c!==l&&(r=r.updateImmediateChild(a,c))}),r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class hs{constructor(e="",n=null,i={children:{},childCount:0}){this.name=e,this.parent=n,this.node=i}}function fs(t,e){let n=e instanceof I?e:new I(e),i=t,s=v(n);for(;s!==null;){const r=et(i.node.children,s)||{children:{},childCount:0};i=new hs(s,i,r),n=S(n),s=v(n)}return i}function dt(t){return t.node.value}function Ta(t,e){t.node.value=e,Ei(t)}function ka(t){return t.node.childCount>0}function l_(t){return dt(t)===void 0&&!ka(t)}function xn(t,e){B(t.node.children,(n,i)=>{e(new hs(n,t,i))})}function Na(t,e,n,i){n&&e(t),xn(t,s=>{Na(s,e,!0)})}function c_(t,e,n){let i=t.parent;for(;i!==null;){if(e(i))return!0;i=i.parent}return!1}function zt(t){return new I(t.parent===null?t.name:zt(t.parent)+"/"+t.name)}function Ei(t){t.parent!==null&&u_(t.parent,t.name,t)}function u_(t,e,n){const i=l_(n),s=ce(t.node.children,e);i&&s?(delete t.node.children[e],t.node.childCount--,Ei(t)):!i&&!s&&(t.node.children[e]=n.node,t.node.childCount++,Ei(t))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const d_=/[\[\].#$\/\u0000-\u001F\u007F]/,h_=/[\[\].#$\u0000-\u001F\u007F]/,Zn=10*1024*1024,_s=function(t){return typeof t=="string"&&t.length!==0&&!d_.test(t)},Aa=function(t){return typeof t=="string"&&t.length!==0&&!h_.test(t)},f_=function(t){return t&&(t=t.replace(/^\/*\.info(\/|$)/,"/")),Aa(t)},Ra=function(t){return t===null||typeof t=="string"||typeof t=="number"&&!kn(t)||t&&typeof t=="object"&&ce(t,".sv")},yn=function(t,e,n,i){i&&e===void 0||On(tt(t,"value"),e,n)},On=function(t,e,n){const i=n instanceof I?new Rh(n,t):n;if(e===void 0)throw new Error(t+"contains undefined "+De(i));if(typeof e=="function")throw new Error(t+"contains a function "+De(i)+" with contents = "+e.toString());if(kn(e))throw new Error(t+"contains "+e.toString()+" "+De(i));if(typeof e=="string"&&e.length>Zn/3&&In(e)>Zn)throw new Error(t+"contains a string greater than "+Zn+" utf8 bytes "+De(i)+" ('"+e.substring(0,50)+"...')");if(e&&typeof e=="object"){let s=!1,r=!1;if(B(e,(o,a)=>{if(o===".value")s=!0;else if(o!==".priority"&&o!==".sv"&&(r=!0,!_s(o)))throw new Error(t+" contains an invalid key ("+o+") "+De(i)+`.  Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`);Ph(i,o),On(t,a,i),Dh(i)}),s&&r)throw new Error(t+' contains ".value" child '+De(i)+" in addition to actual children.")}},__=function(t,e){let n,i;for(n=0;n<e.length;n++){i=e[n];const r=At(i);for(let o=0;o<r.length;o++)if(!(r[o]===".priority"&&o===r.length-1)){if(!_s(r[o]))throw new Error(t+"contains an invalid key ("+r[o]+") in path "+i.toString()+`. Keys must be non-empty strings and can't contain ".", "#", "$", "/", "[", or "]"`)}}e.sort(Ah);let s=null;for(n=0;n<e.length;n++){if(i=e[n],s!==null&&J(s,i))throw new Error(t+"contains a path "+s.toString()+" that is ancestor of another path "+i.toString());s=i}},Pa=function(t,e,n,i){const s=tt(t,"values");if(!(e&&typeof e=="object")||Array.isArray(e))throw new Error(s+" must be an object containing the children to replace.");const r=[];B(e,(o,a)=>{const l=new I(o);if(On(s,a,A(n,l)),qi(l)===".priority"&&!Ra(a))throw new Error(s+"contains an invalid value for '"+l.toString()+"', which must be a valid Firebase priority (a string, finite number, server value, or null).");r.push(l)}),__(s,r)},p_=function(t,e,n){if(kn(e))throw new Error(tt(t,"priority")+"is "+e.toString()+", but must be a valid Firebase priority (a string, finite number, server value, or null).");if(!Ra(e))throw new Error(tt(t,"priority")+"must be a valid Firebase priority (a string, finite number, server value, or null).")},Da=function(t,e,n,i){if(!Aa(n))throw new Error(tt(t,e)+'was an invalid path = "'+n+`". Paths must be non-empty strings and can't contain ".", "#", "$", "[", or "]"`)},g_=function(t,e,n,i){n&&(n=n.replace(/^\/*\.info(\/|$)/,"/")),Da(t,e,n)},Le=function(t,e){if(v(e)===".info")throw new Error(t+" failed = Can't modify data under /.info/")},m_=function(t,e){const n=e.path.toString();if(typeof e.repoInfo.host!="string"||e.repoInfo.host.length===0||!_s(e.repoInfo.namespace)&&e.repoInfo.host.split(":")[0]!=="localhost"||n.length!==0&&!f_(n))throw new Error(tt(t,"url")+`must be a valid firebase URL and the path can't contain ".", "#", "$", "[", or "]".`)};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class v_{constructor(){this.eventLists_=[],this.recursionDepth_=0}}function Mn(t,e){let n=null;for(let i=0;i<e.length;i++){const s=e[i],r=s.getPath();n!==null&&!Gi(r,n.path)&&(t.eventLists_.push(n),n=null),n===null&&(n={events:[],path:r}),n.events.push(s)}n&&t.eventLists_.push(n)}function xa(t,e,n){Mn(t,n),Oa(t,i=>Gi(i,e))}function Z(t,e,n){Mn(t,n),Oa(t,i=>J(i,e)||J(e,i))}function Oa(t,e){t.recursionDepth_++;let n=!0;for(let i=0;i<t.eventLists_.length;i++){const s=t.eventLists_[i];if(s){const r=s.path;e(r)?(y_(t.eventLists_[i]),t.eventLists_[i]=null):n=!1}}n&&(t.eventLists_=[]),t.recursionDepth_--}function y_(t){for(let e=0;e<t.events.length;e++){const n=t.events[e];if(n!==null){t.events[e]=null;const i=n.getEventRunner();yt&&F("event: "+n.toString()),lt(i)}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const C_="repo_interrupt",b_=25;class w_{constructor(e,n,i,s){this.repoInfo_=e,this.forceRestClient_=n,this.authTokenProvider_=i,this.appCheckProvider_=s,this.dataUpdateCount=0,this.statsListener_=null,this.eventQueue_=new v_,this.nextWriteId_=1,this.interceptServerDataCallback_=null,this.onDisconnect_=un(),this.transactionQueueTree_=new hs,this.persistentConnection_=null,this.key=this.repoInfo_.toURLString()}toString(){return(this.repoInfo_.secure?"https://":"http://")+this.repoInfo_.host}}function E_(t,e,n){if(t.stats_=zi(t.repoInfo_),t.forceRestClient_||eh())t.server_=new cn(t.repoInfo_,(i,s,r,o)=>{Ir(t,i,s,r,o)},t.authTokenProvider_,t.appCheckProvider_),setTimeout(()=>Sr(t,!0),0);else{if(typeof n<"u"&&n!==null){if(typeof n!="object")throw new Error("Only objects are supported for option databaseAuthVariableOverride");try{O(n)}catch(i){throw new Error("Invalid authOverride provided: "+i)}}t.persistentConnection_=new he(t.repoInfo_,e,(i,s,r,o)=>{Ir(t,i,s,r,o)},i=>{Sr(t,i)},i=>{I_(t,i)},t.authTokenProvider_,t.appCheckProvider_,n),t.server_=t.persistentConnection_}t.authTokenProvider_.addTokenChangeListener(i=>{t.server_.refreshAuthToken(i)}),t.appCheckProvider_.addTokenChangeListener(i=>{t.server_.refreshAppCheckToken(i.token)}),t.statsReporter_=rh(t.repoInfo_,()=>new rf(t.stats_,t.server_)),t.infoData_=new Zh,t.infoSyncTree_=new wr({startListening:(i,s,r,o)=>{let a=[];const l=t.infoData_.getNode(i._path);return l.isEmpty()||(a=Ht(t.infoSyncTree_,i._path,l),setTimeout(()=>{o("ok")},0)),a},stopListening:()=>{}}),ps(t,"connected",!1),t.serverSyncTree_=new wr({startListening:(i,s,r,o)=>(t.server_.listen(i,r,s,(a,l)=>{const c=o(a,l);Z(t.eventQueue_,i._path,c)}),[]),stopListening:(i,s)=>{t.server_.unlisten(i,s)}})}function Ma(t){const n=t.infoData_.getNode(new I(".info/serverTimeOffset")).val()||0;return new Date().getTime()+n}function Ln(t){return r_({timestamp:Ma(t)})}function Ir(t,e,n,i,s){t.dataUpdateCount++;const r=new I(e);n=t.interceptServerDataCallback_?t.interceptServerDataCallback_(e,n):n;let o=[];if(s)if(i){const l=tn(n,c=>P(c));o=Zf(t.serverSyncTree_,r,l,s)}else{const l=P(n);o=Ca(t.serverSyncTree_,r,l,s)}else if(i){const l=tn(n,c=>P(c));o=Qf(t.serverSyncTree_,r,l)}else{const l=P(n);o=Ht(t.serverSyncTree_,r,l)}let a=r;o.length>0&&(a=ot(t,r)),Z(t.eventQueue_,a,o)}function Sr(t,e){ps(t,"connected",e),e===!1&&N_(t)}function I_(t,e){B(e,(n,i)=>{ps(t,n,i)})}function ps(t,e,n){const i=new I("/.info/"+e),s=P(n);t.infoData_.updateSnapshot(i,s);const r=Ht(t.infoSyncTree_,i,s);Z(t.eventQueue_,i,r)}function gs(t){return t.nextWriteId_++}function S_(t,e,n){const i=e_(t.serverSyncTree_,e);return i!=null?Promise.resolve(i):t.server_.get(e).then(s=>{const r=P(s).withIndex(e._queryParams.getIndex());wi(t.serverSyncTree_,e,n,!0);let o;if(e._queryParams.loadsAllData())o=Ht(t.serverSyncTree_,e._path,r);else{const a=Ot(t.serverSyncTree_,e);o=Ca(t.serverSyncTree_,e._path,r,a)}return Z(t.eventQueue_,e._path,o),vn(t.serverSyncTree_,e,n,null,!0),r},s=>(jt(t,"get for query "+O(e)+" failed: "+s),Promise.reject(new Error(s))))}function T_(t,e,n,i,s){jt(t,"set",{path:e.toString(),value:n,priority:i});const r=Ln(t),o=P(n,i),a=rs(t.serverSyncTree_,e),l=Sa(o,a,r),c=gs(t),u=ya(t.serverSyncTree_,e,l,c,!0);Mn(t.eventQueue_,u),t.server_.put(e.toString(),o.val(!0),(h,f)=>{const p=h==="ok";p||z("set at "+e+" failed: "+h);const b=Ce(t.serverSyncTree_,c,!p);Z(t.eventQueue_,e,b),Ae(t,s,h,f)});const d=vs(t,e);ot(t,d),Z(t.eventQueue_,d,[])}function k_(t,e,n,i){jt(t,"update",{path:e.toString(),value:n});let s=!0;const r=Ln(t),o={};if(B(n,(a,l)=>{s=!1,o[a]=Ia(A(e,a),P(l),t.serverSyncTree_,r)}),s)F("update() called with empty data.  Don't do anything."),Ae(t,i,"ok",void 0);else{const a=gs(t),l=Kf(t.serverSyncTree_,e,o,a);Mn(t.eventQueue_,l),t.server_.merge(e.toString(),n,(c,u)=>{const d=c==="ok";d||z("update at "+e+" failed: "+c);const h=Ce(t.serverSyncTree_,a,!d),f=h.length>0?ot(t,e):e;Z(t.eventQueue_,f,h),Ae(t,i,c,u)}),B(n,c=>{const u=vs(t,A(e,c));ot(t,u)}),Z(t.eventQueue_,e,[])}}function N_(t){jt(t,"onDisconnectEvents");const e=Ln(t),n=un();gi(t.onDisconnect_,E(),(s,r)=>{const o=Ia(s,r,t.serverSyncTree_,e);ct(n,s,o)});let i=[];gi(n,E(),(s,r)=>{i=i.concat(Ht(t.serverSyncTree_,s,r));const o=vs(t,s);ot(t,o)}),t.onDisconnect_=un(),Z(t.eventQueue_,E(),i)}function A_(t,e,n){t.server_.onDisconnectCancel(e.toString(),(i,s)=>{i==="ok"&&pi(t.onDisconnect_,e),Ae(t,n,i,s)})}function Tr(t,e,n,i){const s=P(n);t.server_.onDisconnectPut(e.toString(),s.val(!0),(r,o)=>{r==="ok"&&ct(t.onDisconnect_,e,s),Ae(t,i,r,o)})}function R_(t,e,n,i,s){const r=P(n,i);t.server_.onDisconnectPut(e.toString(),r.val(!0),(o,a)=>{o==="ok"&&ct(t.onDisconnect_,e,r),Ae(t,s,o,a)})}function P_(t,e,n,i){if(ri(n)){F("onDisconnect().update() called with empty data.  Don't do anything."),Ae(t,i,"ok",void 0);return}t.server_.onDisconnectMerge(e.toString(),n,(s,r)=>{s==="ok"&&B(n,(o,a)=>{const l=P(a);ct(t.onDisconnect_,A(e,o),l)}),Ae(t,i,s,r)})}function D_(t,e,n){let i;v(e._path)===".info"?i=wi(t.infoSyncTree_,e,n):i=wi(t.serverSyncTree_,e,n),xa(t.eventQueue_,e._path,i)}function x_(t,e,n){let i;v(e._path)===".info"?i=vn(t.infoSyncTree_,e,n):i=vn(t.serverSyncTree_,e,n),xa(t.eventQueue_,e._path,i)}function O_(t){t.persistentConnection_&&t.persistentConnection_.interrupt(C_)}function jt(t,...e){let n="";t.persistentConnection_&&(n=t.persistentConnection_.id+":"),F(n,...e)}function Ae(t,e,n,i){e&&lt(()=>{if(n==="ok")e(null);else{const s=(n||"error").toUpperCase();let r=s;i&&(r+=": "+i);const o=new Error(r);o.code=s,e(o)}})}function La(t,e,n){return rs(t.serverSyncTree_,e,n)||m.EMPTY_NODE}function ms(t,e=t.transactionQueueTree_){if(e||Fn(t,e),dt(e)){const n=Ba(t,e);_(n.length>0,"Sending zero length transaction queue"),n.every(s=>s.status===0)&&M_(t,zt(e),n)}else ka(e)&&xn(e,n=>{ms(t,n)})}function M_(t,e,n){const i=n.map(c=>c.currentWriteId),s=La(t,e,i);let r=s;const o=s.hash();for(let c=0;c<n.length;c++){const u=n[c];_(u.status===0,"tryToSendTransactionQueue_: items in queue should all be run."),u.status=1,u.retryCount++;const d=H(e,u.path);r=r.updateChild(d,u.currentOutputSnapshotRaw)}const a=r.val(!0),l=e;t.server_.put(l.toString(),a,c=>{jt(t,"transaction put response",{path:l.toString(),status:c});let u=[];if(c==="ok"){const d=[];for(let h=0;h<n.length;h++)n[h].status=2,u=u.concat(Ce(t.serverSyncTree_,n[h].currentWriteId)),n[h].onComplete&&d.push(()=>n[h].onComplete(null,!0,n[h].currentOutputSnapshotResolved)),n[h].unwatcher();Fn(t,fs(t.transactionQueueTree_,e)),ms(t,t.transactionQueueTree_),Z(t.eventQueue_,e,u);for(let h=0;h<d.length;h++)lt(d[h])}else{if(c==="datastale")for(let d=0;d<n.length;d++)n[d].status===3?n[d].status=4:n[d].status=0;else{z("transaction at "+l.toString()+" failed: "+c);for(let d=0;d<n.length;d++)n[d].status=4,n[d].abortReason=c}ot(t,e)}},o)}function ot(t,e){const n=Fa(t,e),i=zt(n),s=Ba(t,n);return L_(t,s,i),i}function L_(t,e,n){if(e.length===0)return;const i=[];let s=[];const o=e.filter(a=>a.status===0).map(a=>a.currentWriteId);for(let a=0;a<e.length;a++){const l=e[a],c=H(n,l.path);let u=!1,d;if(_(c!==null,"rerunTransactionsUnderNode_: relativePath should not be null."),l.status===4)u=!0,d=l.abortReason,s=s.concat(Ce(t.serverSyncTree_,l.currentWriteId,!0));else if(l.status===0)if(l.retryCount>=b_)u=!0,d="maxretry",s=s.concat(Ce(t.serverSyncTree_,l.currentWriteId,!0));else{const h=La(t,l.path,o);l.currentInputSnapshot=h;const f=e[a].update(h.val());if(f!==void 0){On("transaction failed: Data returned ",f,l.path);let p=P(f);typeof f=="object"&&f!=null&&ce(f,".priority")||(p=p.updatePriority(h.getPriority()));const T=l.currentWriteId,W=Ln(t),j=Sa(p,h,W);l.currentOutputSnapshotRaw=p,l.currentOutputSnapshotResolved=j,l.currentWriteId=gs(t),o.splice(o.indexOf(T),1),s=s.concat(ya(t.serverSyncTree_,l.path,j,l.currentWriteId,l.applyLocally)),s=s.concat(Ce(t.serverSyncTree_,T,!0))}else u=!0,d="nodata",s=s.concat(Ce(t.serverSyncTree_,l.currentWriteId,!0))}Z(t.eventQueue_,n,s),s=[],u&&(e[a].status=2,function(h){setTimeout(h,Math.floor(0))}(e[a].unwatcher),e[a].onComplete&&(d==="nodata"?i.push(()=>e[a].onComplete(null,!1,e[a].currentInputSnapshot)):i.push(()=>e[a].onComplete(new Error(d),!1,null))))}Fn(t,t.transactionQueueTree_);for(let a=0;a<i.length;a++)lt(i[a]);ms(t,t.transactionQueueTree_)}function Fa(t,e){let n,i=t.transactionQueueTree_;for(n=v(e);n!==null&&dt(i)===void 0;)i=fs(i,n),e=S(e),n=v(e);return i}function Ba(t,e){const n=[];return Va(t,e,n),n.sort((i,s)=>i.order-s.order),n}function Va(t,e,n){const i=dt(e);if(i)for(let s=0;s<i.length;s++)n.push(i[s]);xn(e,s=>{Va(t,s,n)})}function Fn(t,e){const n=dt(e);if(n){let i=0;for(let s=0;s<n.length;s++)n[s].status!==2&&(n[i]=n[s],i++);n.length=i,Ta(e,n.length>0?n:void 0)}xn(e,i=>{Fn(t,i)})}function vs(t,e){const n=zt(Fa(t,e)),i=fs(t.transactionQueueTree_,e);return c_(i,s=>{ei(t,s)}),ei(t,i),Na(i,s=>{ei(t,s)}),n}function ei(t,e){const n=dt(e);if(n){const i=[];let s=[],r=-1;for(let o=0;o<n.length;o++)n[o].status===3||(n[o].status===1?(_(r===o-1,"All SENT items should be at beginning of queue."),r=o,n[o].status=3,n[o].abortReason="set"):(_(n[o].status===0,"Unexpected transaction status in abort"),n[o].unwatcher(),s=s.concat(Ce(t.serverSyncTree_,n[o].currentWriteId,!0)),n[o].onComplete&&i.push(n[o].onComplete.bind(null,new Error("set"),!1,null))));r===-1?Ta(e,void 0):n.length=r+1,Z(t.eventQueue_,zt(e),s);for(let o=0;o<i.length;o++)lt(i[o])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function F_(t){let e="";const n=t.split("/");for(let i=0;i<n.length;i++)if(n[i].length>0){let s=n[i];try{s=decodeURIComponent(s.replace(/\+/g," "))}catch{}e+="/"+s}return e}function B_(t){const e={};t.charAt(0)==="?"&&(t=t.substring(1));for(const n of t.split("&")){if(n.length===0)continue;const i=n.split("=");i.length===2?e[decodeURIComponent(i[0])]=decodeURIComponent(i[1]):z(`Invalid query segment '${n}' in query '${t}'`)}return e}const kr=function(t,e){const n=V_(t),i=n.namespace;n.domain==="firebase.com"&&pe(n.host+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead"),(!i||i==="undefined")&&n.domain!=="localhost"&&pe("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com"),n.secure||jd();const s=n.scheme==="ws"||n.scheme==="wss";return{repoInfo:new Uo(n.host,n.secure,i,s,e,"",i!==n.subdomain),path:new I(n.pathString)}},V_=function(t){let e="",n="",i="",s="",r="",o=!0,a="https",l=443;if(typeof t=="string"){let c=t.indexOf("//");c>=0&&(a=t.substring(0,c-1),t=t.substring(c+2));let u=t.indexOf("/");u===-1&&(u=t.length);let d=t.indexOf("?");d===-1&&(d=t.length),e=t.substring(0,Math.min(u,d)),u<d&&(s=F_(t.substring(u,d)));const h=B_(t.substring(Math.min(t.length,d)));c=e.indexOf(":"),c>=0?(o=a==="https"||a==="wss",l=parseInt(e.substring(c+1),10)):c=e.length;const f=e.slice(0,c);if(f.toLowerCase()==="localhost")n="localhost";else if(f.split(".").length<=2)n=f;else{const p=e.indexOf(".");i=e.substring(0,p).toLowerCase(),n=e.substring(p+1),r=i}"ns"in h&&(r=h.ns)}return{host:e,port:l,domain:n,subdomain:i,secure:o,scheme:a,pathString:s,namespace:r}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nr="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz",$_=function(){let t=0;const e=[];return function(n){const i=n===t;t=n;let s;const r=new Array(8);for(s=7;s>=0;s--)r[s]=Nr.charAt(n%64),n=Math.floor(n/64);_(n===0,"Cannot push at time == 0");let o=r.join("");if(i){for(s=11;s>=0&&e[s]===63;s--)e[s]=0;e[s]++}else for(s=0;s<12;s++)e[s]=Math.floor(Math.random()*64);for(s=0;s<12;s++)o+=Nr.charAt(e[s]);return _(o.length===20,"nextPushId: Length should be 20."),o}}();/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class W_{constructor(e,n,i,s){this.eventType=e,this.eventRegistration=n,this.snapshot=i,this.prevName=s}getPath(){const e=this.snapshot.ref;return this.eventType==="value"?e._path:e.parent._path}getEventType(){return this.eventType}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.getPath().toString()+":"+this.eventType+":"+O(this.snapshot.exportVal())}}class U_{constructor(e,n,i){this.eventRegistration=e,this.error=n,this.path=i}getPath(){return this.path}getEventType(){return"cancel"}getEventRunner(){return this.eventRegistration.getEventRunner(this)}toString(){return this.path.toString()+":cancel"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $a{constructor(e,n){this.snapshotCallback=e,this.cancelCallback=n}onValue(e,n){this.snapshotCallback.call(null,e,n)}onCancel(e){return _(this.hasCancelCallback,"Raising a cancel event on a listener with no cancel callback"),this.cancelCallback.call(null,e)}get hasCancelCallback(){return!!this.cancelCallback}matches(e){return this.snapshotCallback===e.snapshotCallback||this.snapshotCallback.userCallback!==void 0&&this.snapshotCallback.userCallback===e.snapshotCallback.userCallback&&this.snapshotCallback.context===e.snapshotCallback.context}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class H_{constructor(e,n){this._repo=e,this._path=n}cancel(){const e=new ae;return A_(this._repo,this._path,e.wrapCallback(()=>{})),e.promise}remove(){Le("OnDisconnect.remove",this._path);const e=new ae;return Tr(this._repo,this._path,null,e.wrapCallback(()=>{})),e.promise}set(e){Le("OnDisconnect.set",this._path),yn("OnDisconnect.set",e,this._path,!1);const n=new ae;return Tr(this._repo,this._path,e,n.wrapCallback(()=>{})),n.promise}setWithPriority(e,n){Le("OnDisconnect.setWithPriority",this._path),yn("OnDisconnect.setWithPriority",e,this._path,!1),p_("OnDisconnect.setWithPriority",n);const i=new ae;return R_(this._repo,this._path,e,n,i.wrapCallback(()=>{})),i.promise}update(e){Le("OnDisconnect.update",this._path),Pa("OnDisconnect.update",e,this._path);const n=new ae;return P_(this._repo,this._path,e,n.wrapCallback(()=>{})),n.promise}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ys{constructor(e,n,i,s){this._repo=e,this._path=n,this._queryParams=i,this._orderByCalled=s}get key(){return y(this._path)?null:qi(this._path)}get ref(){return new ge(this._repo,this._path)}get _queryIdentifier(){const e=hr(this._queryParams),n=Ui(e);return n==="{}"?"default":n}get _queryObject(){return hr(this._queryParams)}isEqual(e){if(e=ue(e),!(e instanceof ys))return!1;const n=this._repo===e._repo,i=Gi(this._path,e._path),s=this._queryIdentifier===e._queryIdentifier;return n&&i&&s}toJSON(){return this.toString()}toString(){return this._repo.toString()+Nh(this._path)}}class ge extends ys{constructor(e,n){super(e,n,new Xi,!1)}get parent(){const e=Xo(this._path);return e===null?null:new ge(this._repo,e)}get root(){let e=this;for(;e.parent!==null;)e=e.parent;return e}}class Mt{constructor(e,n,i){this._node=e,this.ref=n,this._index=i}get priority(){return this._node.getPriority().val()}get key(){return this.ref.key}get size(){return this._node.numChildren()}child(e){const n=new I(e),i=Lt(this.ref,e);return new Mt(this._node.getChild(n),i,R)}exists(){return!this._node.isEmpty()}exportVal(){return this._node.val(!0)}forEach(e){return this._node.isLeafNode()?!1:!!this._node.forEachChild(this._index,(i,s)=>e(new Mt(s,Lt(this.ref,i),R)))}hasChild(e){const n=new I(e);return!this._node.getChild(n).isEmpty()}hasChildren(){return this._node.isLeafNode()?!1:!this._node.isEmpty()}toJSON(){return this.exportVal()}val(){return this._node.val()}}function zp(t,e){return t=ue(t),t._checkNotDeleted("ref"),e!==void 0?Lt(t._root,e):t._root}function Lt(t,e){return t=ue(t),v(t._path)===null?g_("child","path",e):Da("child","path",e),new ge(t._repo,A(t._path,e))}function jp(t){return t=ue(t),new H_(t._repo,t._path)}function qp(t,e){t=ue(t),Le("push",t._path),yn("push",e,t._path,!0);const n=Ma(t._repo),i=$_(n),s=Lt(t,i),r=Lt(t,i);let o;return e!=null?o=Wa(r,e).then(()=>r):o=Promise.resolve(r),s.then=o.then.bind(o),s.catch=o.then.bind(o,void 0),s}function Gp(t){return Le("remove",t._path),Wa(t,null)}function Wa(t,e){t=ue(t),Le("set",t._path),yn("set",e,t._path,!1);const n=new ae;return T_(t._repo,t._path,e,null,n.wrapCallback(()=>{})),n.promise}function Yp(t,e){Pa("update",e,t._path);const n=new ae;return k_(t._repo,t._path,e,n.wrapCallback(()=>{})),n.promise}function Kp(t){t=ue(t);const e=new $a(()=>{}),n=new Bn(e);return S_(t._repo,t,n).then(i=>new Mt(i,new ge(t._repo,t._path),t._queryParams.getIndex()))}class Bn{constructor(e){this.callbackContext=e}respondsTo(e){return e==="value"}createEvent(e,n){const i=n._queryParams.getIndex();return new W_("value",this,new Mt(e.snapshotNode,new ge(n._repo,n._path),i))}getEventRunner(e){return e.getEventType()==="cancel"?()=>this.callbackContext.onCancel(e.error):()=>this.callbackContext.onValue(e.snapshot,null)}createCancelEvent(e,n){return this.callbackContext.hasCancelCallback?new U_(this,e,n):null}matches(e){return e instanceof Bn?!e.callbackContext||!this.callbackContext?!0:e.callbackContext.matches(this.callbackContext):!1}hasAnyCallback(){return this.callbackContext!==null}}function z_(t,e,n,i,s){const r=new $a(n,void 0),o=new Bn(r);return D_(t._repo,t,o),()=>x_(t._repo,t,o)}function Qp(t,e,n,i){return z_(t,"value",e)}Wf(ge);qf(ge);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const j_="FIREBASE_DATABASE_EMULATOR_HOST",Ii={};let q_=!1;function G_(t,e,n,i){t.repoInfo_=new Uo(e,!1,t.repoInfo_.namespace,t.repoInfo_.webSocketOnly,t.repoInfo_.nodeAdmin,t.repoInfo_.persistenceKey,t.repoInfo_.includeNamespaceInQueryParams,!0,n),i&&(t.authTokenProvider_=i)}function Y_(t,e,n,i,s){let r=i||t.options.databaseURL;r===void 0&&(t.options.projectId||pe("Can't determine Firebase Database URL. Be sure to include  a Project ID when calling firebase.initializeApp()."),F("Using default host for project ",t.options.projectId),r=`${t.options.projectId}-default-rtdb.firebaseio.com`);let o=kr(r,s),a=o.repoInfo,l;typeof process<"u"&&Ys&&(l=Ys[j_]),l?(r=`http://${l}?ns=${a.namespace}`,o=kr(r,s),a=o.repoInfo):o.repoInfo.secure;const c=new nh(t.name,t.options,e);m_("Invalid Firebase Database URL",o),y(o.path)||pe("Database URL must point to the root of a Firebase Database (not including a child path).");const u=Q_(a,t,c,new th(t,n));return new X_(u,t)}function K_(t,e){const n=Ii[e];(!n||n[t.key]!==t)&&pe(`Database ${e}(${t.repoInfo_}) has already been deleted.`),O_(t),delete n[t.key]}function Q_(t,e,n,i){let s=Ii[e.name];s||(s={},Ii[e.name]=s);let r=s[t.toURLString()];return r&&pe("Database initialized multiple times. Please make sure the format of the database URL matches with each database() call."),r=new w_(t,q_,n,i),s[t.toURLString()]=r,r}class X_{constructor(e,n){this._repoInternal=e,this.app=n,this.type="database",this._instanceStarted=!1}get _repo(){return this._instanceStarted||(E_(this._repoInternal,this.app.options.appId,this.app.options.databaseAuthVariableOverride),this._instanceStarted=!0),this._repoInternal}get _root(){return this._rootInternal||(this._rootInternal=new ge(this._repo,E())),this._rootInternal}_delete(){return this._rootInternal!==null&&(K_(this._repo,this.app.name),this._repoInternal=null,this._rootInternal=null),Promise.resolve()}_checkNotDeleted(e){this._rootInternal===null&&pe("Cannot call "+e+" on a deleted database.")}}function J_(t=no(),e){const n=Vt(t,"database").getImmediate({identifier:e});if(!n._instanceStarted){const i=zl("database");i&&Z_(n,...i)}return n}function Z_(t,e,n,i={}){t=ue(t),t._checkNotDeleted("useEmulator");const s=`${e}:${n}`,r=t._repoInternal;if(t._instanceStarted){if(s===t._repoInternal.repoInfo_.host&&Tt(i,r.repoInfo_.emulatorOptions))return;pe("connectDatabaseEmulator() cannot initialize or alter the emulator configuration after the database instance has started.")}let o;if(r.repoInfo_.nodeAdmin)i.mockUserToken&&pe('mockUserToken is not supported by the Admin SDK. For client access with mock users, please use the "firebase" package instead of "firebase-admin".'),o=new Xt(Xt.OWNER);else if(i.mockUserToken){const a=typeof i.mockUserToken=="string"?i.mockUserToken:jl(i.mockUserToken,t.app.options.projectId);o=new Xt(a)}G_(r,s,i,o)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ep(t){Vd(au),Se(new fe("database",(e,{instanceIdentifier:n})=>{const i=e.getProvider("app").getImmediate(),s=e.getProvider("auth-internal"),r=e.getProvider("app-check-internal");return Y_(i,s,r,n)},"PUBLIC").setMultipleInstances(!0)),le(Ks,Qs,t),le(Ks,Qs,"esm2017")}he.prototype.simpleListen=function(t,e){this.sendRequest("q",{p:t},e)};he.prototype.echo=function(t,e){this.sendRequest("echo",{d:t},e)};ep();const tp={apiKey:"AIzaSyACpt_LrV8iNkYWfnI8VY_cnMr495yq7rc",authDomain:"card-chess-game.firebaseapp.com",projectId:"card-chess-game",storageBucket:"card-chess-game.firebasestorage.app",messagingSenderId:"433806880393",appId:"1:433806880393:web:b3ee4225d8cd9eb3aa2058",measurementId:"G-RZP6YG4TVP",databaseURL:"https://card-chess-game-default-rtdb.europe-west1.firebasedatabase.app/"},Ua=to(tp);Md(Ua);const Xp=J_(Ua),Ha=D({border:[Boolean,Number,String]},"border");function za(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Ue();return{borderClasses:V(()=>{const i=t.border;return i===!0||i===""?`${e}--border`:typeof i=="string"||i===0?String(i).split(" ").map(s=>`border-${s}`):[]})}}const np=[null,"default","comfortable","compact"],Cs=D({density:{type:String,default:"default",validator:t=>np.includes(t)}},"density");function ja(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Ue();return{densityClasses:te(()=>`${e}--density-${t.density}`)}}const ip=D({elevation:{type:[Number,String],validator(t){const e=parseInt(t);return!isNaN(e)&&e>=0&&e<=24}}},"elevation");function sp(t){return{elevationClasses:te(()=>{const n=ni(t)?t.value:t.elevation;return n==null?[]:[`elevation-${n}`]})}}const Vn=D({rounded:{type:[Boolean,Number,String],default:void 0},tile:Boolean},"rounded");function $n(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Ue();return{roundedClasses:V(()=>{const i=ni(t)?t.value:t.rounded,s=ni(t)?t.value:t.tile,r=[];if(i===!0||i==="")r.push(`${e}--rounded`);else if(typeof i=="string"||i===0)for(const o of String(i).split(" "))r.push(`rounded-${o}`);else(s||i===!1)&&r.push("rounded-0");return r})}}function bs(t){return Mr(()=>{const e=It(t),n=[],i={};if(e.background)if(ws(e.background)){if(i.backgroundColor=e.background,!e.text&&fl(e.background)){const s=_l(e.background);if(s.a==null||s.a===1){const r=pl(s);i.color=r,i.caretColor=r}}}else n.push(`bg-${e.background}`);return e.text&&(ws(e.text)?(i.color=e.text,i.caretColor=e.text):n.push(`text-${e.text}`)),{colorClasses:n,colorStyles:i}})}function qa(t){const{colorClasses:e,colorStyles:n}=bs(()=>({text:It(t)}));return{textColorClasses:e,textColorStyles:n}}function Jt(t){const{colorClasses:e,colorStyles:n}=bs(()=>({background:It(t)}));return{backgroundColorClasses:e,backgroundColorStyles:n}}const rp=["elevated","flat","tonal","outlined","text","plain"];function Ga(t,e){return g(Zt,null,[t&&g("span",{key:"overlay",class:`${e}__overlay`},null),g("span",{key:"underlay",class:`${e}__underlay`},null)])}const Ya=D({color:String,variant:{type:String,default:"elevated",validator:t=>rp.includes(t)}},"variant");function Ka(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Ue();const n=te(()=>{const{variant:r}=It(t);return`${e}--variant-${r}`}),{colorClasses:i,colorStyles:s}=bs(()=>{const{variant:r,color:o}=It(t);return{[["elevated","flat"].includes(r)?"background":"text"]:o}});return{colorClasses:i,colorStyles:s,variantClasses:n}}const op=D({defaults:Object,disabled:Boolean,reset:[Number,String],root:[Boolean,String],scoped:Boolean},"VDefaultsProvider"),Cn=X(!1)({name:"VDefaultsProvider",props:op(),setup(t,e){let{slots:n}=e;const{defaults:i,disabled:s,reset:r,root:o,scoped:a}=gl(t);return Lr(i,{reset:r,root:o,scoped:a,disabled:s}),()=>{var l;return(l=n.default)==null?void 0:l.call(n)}}}),ap=["x-small","small","default","large","x-large"],Qa=D({size:{type:[String,Number],default:"default"}},"size");function Xa(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Ue();return Mr(()=>{const n=t.size;let i,s;return ti(ap,n)?i=`${e}--size-${n}`:n&&(s={width:U(n),height:U(n)}),{sizeClasses:i,sizeStyles:s}})}const lp=D({color:String,disabled:Boolean,start:Boolean,end:Boolean,icon:Ze,opacity:[String,Number],...ee(),...Qa(),...He({tag:"i"}),...wn()},"VIcon"),Si=X()({name:"VIcon",props:lp(),setup(t,e){let{attrs:n,slots:i}=e;const s=xe(),{themeClasses:r}=ml(),{iconData:o}=vl(()=>s.value||t.icon),{sizeClasses:a}=Xa(t),{textColorClasses:l,textColorStyles:c}=qa(()=>t.color);return re(()=>{var h,f;const u=(h=i.default)==null?void 0:h.call(i);u&&(s.value=(f=yl(u).filter(p=>p.type===Cl&&p.children&&typeof p.children=="string")[0])==null?void 0:f.children);const d=!!(n.onClick||n.onClickOnce);return g(o.value.component,{tag:t.tag,icon:o.value.icon,class:["v-icon","notranslate",r.value,a.value,l.value,{"v-icon--clickable":d,"v-icon--disabled":t.disabled,"v-icon--start":t.start,"v-icon--end":t.end},t.class],style:[{"--v-icon-opacity":t.opacity},a.value?void 0:{fontSize:U(t.size),height:U(t.size),width:U(t.size)},c.value,t.style],role:d?"button":void 0,"aria-hidden":!d,tabindex:d?t.disabled?-1:0:void 0},{default:()=>[u]})}),{}}});function cp(t,e){const n=Fr(),i=xe(!1);if(Ni){const s=new IntersectionObserver(r=>{i.value=!!r.find(o=>o.isIntersecting)},e);Br(()=>{s.disconnect()}),Qt(n,(r,o)=>{o&&(s.unobserve(o),i.value=!1),r&&s.observe(r)},{flush:"post"})}return{intersectionRef:n,isIntersecting:i}}const Ar={center:"center",top:"bottom",bottom:"top",left:"right",right:"left"},Ja=D({location:String},"location");function Za(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1,n=arguments.length>2?arguments[2]:void 0;const{isRtl:i}=Ai();return{locationStyles:V(()=>{if(!t.location)return{};const{side:r,align:o}=Dl(t.location.split(" ").length>1?t.location:`${t.location} center`,i.value);function a(c){return n?n(c):0}const l={};return r!=="center"&&(e?l[Ar[r]]=`calc(100% - ${a(r)}px)`:l[r]=0),o!=="center"?e?l[Ar[o]]=`calc(100% - ${a(o)}px)`:l[o]=0:(r==="center"?l.top=l.left="50%":l[{top:"left",bottom:"left",left:"top",right:"top"}[r]]="50%",l.transform={top:"translateX(-50%)",bottom:"translateX(-50%)",left:"translateY(-50%)",right:"translateY(-50%)",center:"translate(-50%, -50%)"}[r]),l})}}const up=D({absolute:Boolean,active:{type:Boolean,default:!0},bgColor:String,bgOpacity:[Number,String],bufferValue:{type:[Number,String],default:0},bufferColor:String,bufferOpacity:[Number,String],clickable:Boolean,color:String,height:{type:[Number,String],default:4},indeterminate:Boolean,max:{type:[Number,String],default:100},modelValue:{type:[Number,String],default:0},opacity:[Number,String],reverse:Boolean,stream:Boolean,striped:Boolean,roundedBar:Boolean,...ee(),...Ja({location:"top"}),...Vn(),...He(),...wn()},"VProgressLinear"),dp=X()({name:"VProgressLinear",props:up(),emits:{"update:modelValue":t=>!0},setup(t,e){var Re;let{slots:n}=e;const i=bl(t,"modelValue"),{isRtl:s,rtlClasses:r}=Ai(),{themeClasses:o}=Ri(t),{locationStyles:a}=Za(t),{textColorClasses:l,textColorStyles:c}=qa(()=>t.color),{backgroundColorClasses:u,backgroundColorStyles:d}=Jt(()=>t.bgColor||t.color),{backgroundColorClasses:h,backgroundColorStyles:f}=Jt(()=>t.bufferColor||t.bgColor||t.color),{backgroundColorClasses:p,backgroundColorStyles:b}=Jt(()=>t.color),{roundedClasses:T}=$n(t),{intersectionRef:W,isIntersecting:j}=cp(),q=V(()=>parseFloat(t.max)),$=V(()=>parseFloat(t.height)),me=V(()=>Es(parseFloat(t.bufferValue)/q.value*100,0,100)),Ge=V(()=>Es(parseFloat(i.value)/q.value*100,0,100)),ve=V(()=>s.value!==t.reverse),ht=V(()=>t.indeterminate?"fade-transition":"slide-x-transition"),ye=wl&&((Re=window.matchMedia)==null?void 0:Re.call(window,"(forced-colors: active)").matches);function ft(w){if(!W.value)return;const{left:x,right:oe,width:Ye}=W.value.getBoundingClientRect(),qt=ve.value?Ye-w.clientX+(oe-Ye):w.clientX-x;i.value=Math.round(qt/Ye*q.value)}return re(()=>g(t.tag,{ref:W,class:["v-progress-linear",{"v-progress-linear--absolute":t.absolute,"v-progress-linear--active":t.active&&j.value,"v-progress-linear--reverse":ve.value,"v-progress-linear--rounded":t.rounded,"v-progress-linear--rounded-bar":t.roundedBar,"v-progress-linear--striped":t.striped},T.value,o.value,r.value,t.class],style:[{bottom:t.location==="bottom"?0:void 0,top:t.location==="top"?0:void 0,height:t.active?U($.value):0,"--v-progress-linear-height":U($.value),...t.absolute?a.value:{}},t.style],role:"progressbar","aria-hidden":t.active?"false":"true","aria-valuemin":"0","aria-valuemax":t.max,"aria-valuenow":t.indeterminate?void 0:Math.min(parseFloat(i.value),q.value),onClick:t.clickable&&ft},{default:()=>[t.stream&&g("div",{key:"stream",class:["v-progress-linear__stream",l.value],style:{...c.value,[ve.value?"left":"right"]:U(-$.value),borderTop:`${U($.value/2)} dotted`,opacity:parseFloat(t.bufferOpacity),top:`calc(50% - ${U($.value/4)})`,width:U(100-me.value,"%"),"--v-progress-linear-stream-to":U($.value*(ve.value?1:-1))}},null),g("div",{class:["v-progress-linear__background",ye?void 0:u.value],style:[d.value,{opacity:parseFloat(t.bgOpacity),width:t.stream?0:void 0}]},null),g("div",{class:["v-progress-linear__buffer",ye?void 0:h.value],style:[f.value,{opacity:parseFloat(t.bufferOpacity),width:U(me.value,"%")}]},null),g(Vr,{name:ht.value},{default:()=>[t.indeterminate?g("div",{class:"v-progress-linear__indeterminate"},[["long","short"].map(w=>g("div",{key:w,class:["v-progress-linear__indeterminate",w,ye?void 0:p.value],style:b.value},null))]):g("div",{class:["v-progress-linear__determinate",ye?void 0:p.value],style:[b.value,{width:U(Ge.value,"%")}]},null)]}),n.default&&g("div",{class:"v-progress-linear__content"},[n.default({value:Ge.value,buffer:me.value})])]})),{}}}),hp=D({loading:[Boolean,String]},"loader");function fp(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Ue();return{loaderClasses:te(()=>({[`${e}--loading`]:t.loading}))}}function _p(t,e){var i;let{slots:n}=e;return g("div",{class:`${t.name}__loader`},[((i=n.default)==null?void 0:i.call(n,{color:t.color,isActive:t.active}))||g(dp,{absolute:t.absolute,active:t.active,color:t.color,height:"2",indeterminate:!0},null)])}const pp=["static","relative","fixed","absolute","sticky"],gp=D({position:{type:String,validator:t=>pp.includes(t)}},"position");function mp(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:Ue();return{positionClasses:te(()=>t.position?`${e}--${t.position}`:void 0)}}function vp(){const t=$r("useRoute");return V(()=>{var e;return(e=t==null?void 0:t.proxy)==null?void 0:e.$route})}function yp(t,e){var u,d;const n=El("RouterLink"),i=te(()=>!!(t.href||t.to)),s=V(()=>(i==null?void 0:i.value)||Is(e,"click")||Is(t,"click"));if(typeof n=="string"||!("useLink"in n)){const h=te(()=>t.href);return{isLink:i,isClickable:s,href:h,linkProps:Ss({href:h})}}const r=n.useLink({to:te(()=>t.to||""),replace:te(()=>t.replace)}),o=V(()=>t.to?r:void 0),a=vp(),l=V(()=>{var h,f,p;return o.value?t.exact?a.value?((p=o.value.isExactActive)==null?void 0:p.value)&&Il(o.value.route.value.query,a.value.query):((f=o.value.isExactActive)==null?void 0:f.value)??!1:((h=o.value.isActive)==null?void 0:h.value)??!1:!1}),c=V(()=>{var h;return t.to?(h=o.value)==null?void 0:h.route.value.href:t.href});return{isLink:i,isClickable:s,isActive:l,route:(u=o.value)==null?void 0:u.route,navigate:(d=o.value)==null?void 0:d.navigate,href:c,linkProps:Ss({href:c,"aria-current":te(()=>l.value?"page":void 0)})}}const Cp=D({href:String,replace:Boolean,to:[String,Object],exact:Boolean},"router"),Ti=Symbol("rippleStop"),bp=80;function Rr(t,e){t.style.transform=e,t.style.webkitTransform=e}function ki(t){return t.constructor.name==="TouchEvent"}function el(t){return t.constructor.name==="KeyboardEvent"}const wp=function(t,e){var d;let n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},i=0,s=0;if(!el(t)){const h=e.getBoundingClientRect(),f=ki(t)?t.touches[t.touches.length-1]:t;i=f.clientX-h.left,s=f.clientY-h.top}let r=0,o=.3;(d=e._ripple)!=null&&d.circle?(o=.15,r=e.clientWidth/2,r=n.center?r:r+Math.sqrt((i-r)**2+(s-r)**2)/4):r=Math.sqrt(e.clientWidth**2+e.clientHeight**2)/2;const a=`${(e.clientWidth-r*2)/2}px`,l=`${(e.clientHeight-r*2)/2}px`,c=n.center?a:`${i-r}px`,u=n.center?l:`${s-r}px`;return{radius:r,scale:o,x:c,y:u,centerX:a,centerY:l}},bn={show(t,e){var f;let n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};if(!((f=e==null?void 0:e._ripple)!=null&&f.enabled))return;const i=document.createElement("span"),s=document.createElement("span");i.appendChild(s),i.className="v-ripple__container",n.class&&(i.className+=` ${n.class}`);const{radius:r,scale:o,x:a,y:l,centerX:c,centerY:u}=wp(t,e,n),d=`${r*2}px`;s.className="v-ripple__animation",s.style.width=d,s.style.height=d,e.appendChild(i);const h=window.getComputedStyle(e);h&&h.position==="static"&&(e.style.position="relative",e.dataset.previousPosition="static"),s.classList.add("v-ripple__animation--enter"),s.classList.add("v-ripple__animation--visible"),Rr(s,`translate(${a}, ${l}) scale3d(${o},${o},${o})`),s.dataset.activated=String(performance.now()),requestAnimationFrame(()=>{requestAnimationFrame(()=>{s.classList.remove("v-ripple__animation--enter"),s.classList.add("v-ripple__animation--in"),Rr(s,`translate(${c}, ${u}) scale3d(1,1,1)`)})})},hide(t){var r;if(!((r=t==null?void 0:t._ripple)!=null&&r.enabled))return;const e=t.getElementsByClassName("v-ripple__animation");if(e.length===0)return;const n=e[e.length-1];if(n.dataset.isHiding)return;n.dataset.isHiding="true";const i=performance.now()-Number(n.dataset.activated),s=Math.max(250-i,0);setTimeout(()=>{n.classList.remove("v-ripple__animation--in"),n.classList.add("v-ripple__animation--out"),setTimeout(()=>{var a;t.getElementsByClassName("v-ripple__animation").length===1&&t.dataset.previousPosition&&(t.style.position=t.dataset.previousPosition,delete t.dataset.previousPosition),((a=n.parentNode)==null?void 0:a.parentNode)===t&&t.removeChild(n.parentNode)},300)},s)}};function tl(t){return typeof t>"u"||!!t}function Ft(t){const e={},n=t.currentTarget;if(!(!(n!=null&&n._ripple)||n._ripple.touched||t[Ti])){if(t[Ti]=!0,ki(t))n._ripple.touched=!0,n._ripple.isTouch=!0;else if(n._ripple.isTouch)return;if(e.center=n._ripple.centered||el(t),n._ripple.class&&(e.class=n._ripple.class),ki(t)){if(n._ripple.showTimerCommit)return;n._ripple.showTimerCommit=()=>{bn.show(t,n,e)},n._ripple.showTimer=window.setTimeout(()=>{var i;(i=n==null?void 0:n._ripple)!=null&&i.showTimerCommit&&(n._ripple.showTimerCommit(),n._ripple.showTimerCommit=null)},bp)}else bn.show(t,n,e)}}function Pr(t){t[Ti]=!0}function K(t){const e=t.currentTarget;if(e!=null&&e._ripple){if(window.clearTimeout(e._ripple.showTimer),t.type==="touchend"&&e._ripple.showTimerCommit){e._ripple.showTimerCommit(),e._ripple.showTimerCommit=null,e._ripple.showTimer=window.setTimeout(()=>{K(t)});return}window.setTimeout(()=>{e._ripple&&(e._ripple.touched=!1)}),bn.hide(e)}}function nl(t){const e=t.currentTarget;e!=null&&e._ripple&&(e._ripple.showTimerCommit&&(e._ripple.showTimerCommit=null),window.clearTimeout(e._ripple.showTimer))}let Bt=!1;function il(t){!Bt&&(t.keyCode===Ts.enter||t.keyCode===Ts.space)&&(Bt=!0,Ft(t))}function sl(t){Bt=!1,K(t)}function rl(t){Bt&&(Bt=!1,K(t))}function ol(t,e,n){const{value:i,modifiers:s}=e,r=tl(i);if(r||bn.hide(t),t._ripple=t._ripple??{},t._ripple.enabled=r,t._ripple.centered=s.center,t._ripple.circle=s.circle,Sl(i)&&i.class&&(t._ripple.class=i.class),r&&!n){if(s.stop){t.addEventListener("touchstart",Pr,{passive:!0}),t.addEventListener("mousedown",Pr);return}t.addEventListener("touchstart",Ft,{passive:!0}),t.addEventListener("touchend",K,{passive:!0}),t.addEventListener("touchmove",nl,{passive:!0}),t.addEventListener("touchcancel",K),t.addEventListener("mousedown",Ft),t.addEventListener("mouseup",K),t.addEventListener("mouseleave",K),t.addEventListener("keydown",il),t.addEventListener("keyup",sl),t.addEventListener("blur",rl),t.addEventListener("dragstart",K,{passive:!0})}else!r&&n&&al(t)}function al(t){t.removeEventListener("mousedown",Ft),t.removeEventListener("touchstart",Ft),t.removeEventListener("touchend",K),t.removeEventListener("touchmove",nl),t.removeEventListener("touchcancel",K),t.removeEventListener("mouseup",K),t.removeEventListener("mouseleave",K),t.removeEventListener("keydown",il),t.removeEventListener("keyup",sl),t.removeEventListener("dragstart",K),t.removeEventListener("blur",rl)}function Ep(t,e){ol(t,e,!1)}function Ip(t){delete t._ripple,al(t)}function Sp(t,e){if(e.value===e.oldValue)return;const n=tl(e.oldValue);ol(t,e,n)}const Tp={mounted:Ep,unmounted:Ip,updated:Sp},kp=X()({name:"VCardActions",props:ee(),setup(t,e){let{slots:n}=e;return Lr({VBtn:{slim:!0,variant:"text"}}),re(()=>{var i;return g("div",{class:["v-card-actions",t.class],style:t.style},[(i=n.default)==null?void 0:i.call(n)])}),{}}}),Np=D({opacity:[Number,String],...ee(),...He()},"VCardSubtitle"),Ap=X()({name:"VCardSubtitle",props:Np(),setup(t,e){let{slots:n}=e;return re(()=>g(t.tag,{class:["v-card-subtitle",t.class],style:[{"--v-card-subtitle-opacity":t.opacity},t.style]},n)),{}}}),Rp=xl("v-card-title");function Pp(t){return{aspectStyles:V(()=>{const e=Number(t.aspectRatio);return e?{paddingBottom:String(1/e*100)+"%"}:void 0})}}const ll=D({aspectRatio:[String,Number],contentClass:null,inline:Boolean,...ee(),...Di()},"VResponsive"),Dr=X()({name:"VResponsive",props:ll(),setup(t,e){let{slots:n}=e;const{aspectStyles:i}=Pp(t),{dimensionStyles:s}=Pi(t);return re(()=>{var r;return g("div",{class:["v-responsive",{"v-responsive--inline":t.inline},t.class],style:[s.value,t.style]},[g("div",{class:"v-responsive__sizer",style:i.value},null),(r=n.additional)==null?void 0:r.call(n),n.default&&g("div",{class:["v-responsive__content",t.contentClass]},[n.default()])])}),{}}}),Dp=D({transition:{type:[Boolean,String,Object],default:"fade-transition",validator:t=>t!==!0}},"transition"),Kt=(t,e)=>{let{slots:n}=e;const{transition:i,disabled:s,group:r,...o}=t,{component:a=r?Tl:Vr,...l}=typeof i=="object"?i:{};return Or(a,xi(typeof i=="string"?{name:s?"":i}:l,typeof i=="string"?{}:Object.fromEntries(Object.entries({disabled:s,group:r}).filter(c=>{let[u,d]=c;return d!==void 0})),o),n)};function xp(t,e){if(!Ni)return;const n=e.modifiers||{},i=e.value,{handler:s,options:r}=typeof i=="object"?i:{handler:i,options:{}},o=new IntersectionObserver(function(){var d;let a=arguments.length>0&&arguments[0]!==void 0?arguments[0]:[],l=arguments.length>1?arguments[1]:void 0;const c=(d=t._observe)==null?void 0:d[e.instance.$.uid];if(!c)return;const u=a.some(h=>h.isIntersecting);s&&(!n.quiet||c.init)&&(!n.once||u||c.init)&&s(u,a,l),u&&n.once?cl(t,e):c.init=!0},r);t._observe=Object(t._observe),t._observe[e.instance.$.uid]={init:!1,observer:o},o.observe(t)}function cl(t,e){var i;const n=(i=t._observe)==null?void 0:i[e.instance.$.uid];n&&(n.observer.unobserve(t),delete t._observe[e.instance.$.uid])}const Op={mounted:xp,unmounted:cl},Mp=D({absolute:Boolean,alt:String,cover:Boolean,color:String,draggable:{type:[Boolean,String],default:void 0},eager:Boolean,gradient:String,lazySrc:String,options:{type:Object,default:()=>({root:void 0,rootMargin:void 0,threshold:void 0})},sizes:String,src:{type:[String,Object],default:""},crossorigin:String,referrerpolicy:String,srcset:String,position:String,...ll(),...ee(),...Vn(),...Dp()},"VImg"),ul=X()({name:"VImg",directives:{intersect:Op},props:Mp(),emits:{loadstart:t=>!0,load:t=>!0,error:t=>!0},setup(t,e){let{emit:n,slots:i}=e;const{backgroundColorClasses:s,backgroundColorStyles:r}=Jt(()=>t.color),{roundedClasses:o}=$n(t),a=$r("VImg"),l=xe(""),c=Fr(),u=xe(t.eager?"loading":"idle"),d=xe(),h=xe(),f=V(()=>t.src&&typeof t.src=="object"?{src:t.src.src,srcset:t.srcset||t.src.srcset,lazySrc:t.lazySrc||t.src.lazySrc,aspect:Number(t.aspectRatio||t.src.aspect||0)}:{src:t.src,srcset:t.srcset,lazySrc:t.lazySrc,aspect:Number(t.aspectRatio||0)}),p=V(()=>f.value.aspect||d.value/h.value||0);Qt(()=>t.src,()=>{b(u.value!=="idle")}),Qt(p,(w,x)=>{!w&&x&&c.value&&$(c.value)}),kl(()=>b());function b(w){if(!(t.eager&&w)&&!(Ni&&!w&&!t.eager)){if(u.value="loading",f.value.lazySrc){const x=new Image;x.src=f.value.lazySrc,$(x,null)}f.value.src&&Nl(()=>{var x;n("loadstart",((x=c.value)==null?void 0:x.currentSrc)||f.value.src),setTimeout(()=>{var oe;if(!a.isUnmounted)if((oe=c.value)!=null&&oe.complete){if(c.value.naturalWidth||W(),u.value==="error")return;p.value||$(c.value,null),u.value==="loading"&&T()}else p.value||$(c.value),j()})})}}function T(){var w;a.isUnmounted||(j(),$(c.value),u.value="loaded",n("load",((w=c.value)==null?void 0:w.currentSrc)||f.value.src))}function W(){var w;a.isUnmounted||(u.value="error",n("error",((w=c.value)==null?void 0:w.currentSrc)||f.value.src))}function j(){const w=c.value;w&&(l.value=w.currentSrc||w.src)}let q=-1;Br(()=>{clearTimeout(q)});function $(w){let x=arguments.length>1&&arguments[1]!==void 0?arguments[1]:100;const oe=()=>{if(clearTimeout(q),a.isUnmounted)return;const{naturalHeight:Ye,naturalWidth:qt}=w;Ye||qt?(d.value=qt,h.value=Ye):!w.complete&&u.value==="loading"&&x!=null?q=window.setTimeout(oe,x):(w.currentSrc.endsWith(".svg")||w.currentSrc.startsWith("data:image/svg+xml"))&&(d.value=1,h.value=1)};oe()}const me=te(()=>({"v-img__img--cover":t.cover,"v-img__img--contain":!t.cover})),Ge=()=>{var oe;if(!f.value.src||u.value==="idle")return null;const w=g("img",{class:["v-img__img",me.value],style:{objectPosition:t.position},crossorigin:t.crossorigin,src:f.value.src,srcset:f.value.srcset,alt:t.alt,referrerpolicy:t.referrerpolicy,draggable:t.draggable,sizes:t.sizes,ref:c,onLoad:T,onError:W},null),x=(oe=i.sources)==null?void 0:oe.call(i);return g(Kt,{transition:t.transition,appear:!0},{default:()=>[ii(x?g("picture",{class:"v-img__picture"},[x,w]):w,[[Al,u.value==="loaded"]])]})},ve=()=>g(Kt,{transition:t.transition},{default:()=>[f.value.lazySrc&&u.value!=="loaded"&&g("img",{class:["v-img__img","v-img__img--preload",me.value],style:{objectPosition:t.position},crossorigin:t.crossorigin,src:f.value.lazySrc,alt:t.alt,referrerpolicy:t.referrerpolicy,draggable:t.draggable},null)]}),ht=()=>i.placeholder?g(Kt,{transition:t.transition,appear:!0},{default:()=>[(u.value==="loading"||u.value==="error"&&!i.error)&&g("div",{class:"v-img__placeholder"},[i.placeholder()])]}):null,ye=()=>i.error?g(Kt,{transition:t.transition,appear:!0},{default:()=>[u.value==="error"&&g("div",{class:"v-img__error"},[i.error()])]}):null,ft=()=>t.gradient?g("div",{class:"v-img__gradient",style:{backgroundImage:`linear-gradient(${t.gradient})`}},null):null,Re=xe(!1);{const w=Qt(p,x=>{x&&(requestAnimationFrame(()=>{requestAnimationFrame(()=>{Re.value=!0})}),w())})}return re(()=>{const w=Dr.filterProps(t);return ii(g(Dr,xi({class:["v-img",{"v-img--absolute":t.absolute,"v-img--booting":!Re.value},s.value,o.value,t.class],style:[{width:U(t.width==="auto"?d.value:t.width)},r.value,t.style]},w,{aspectRatio:p.value,"aria-label":t.alt,role:t.alt?"img":void 0}),{additional:()=>g(Zt,null,[g(Ge,null,null),g(ve,null,null),g(ft,null,null),g(ht,null,null),g(ye,null,null)]),default:i.default}),[[Wr("intersect"),{handler:b,options:t.options},null,{once:!0}]])}),{currentSrc:l,image:c,state:u,naturalWidth:d,naturalHeight:h}}}),Lp=D({start:Boolean,end:Boolean,icon:Ze,image:String,text:String,...Ha(),...ee(),...Cs(),...Vn(),...Qa(),...He(),...wn(),...Ya({variant:"flat"})},"VAvatar"),xr=X()({name:"VAvatar",props:Lp(),setup(t,e){let{slots:n}=e;const{themeClasses:i}=Ri(t),{borderClasses:s}=za(t),{colorClasses:r,colorStyles:o,variantClasses:a}=Ka(t),{densityClasses:l}=ja(t),{roundedClasses:c}=$n(t),{sizeClasses:u,sizeStyles:d}=Xa(t);return re(()=>g(t.tag,{class:["v-avatar",{"v-avatar--start":t.start,"v-avatar--end":t.end},i.value,s.value,r.value,l.value,c.value,u.value,a.value,t.class],style:[o.value,d.value,t.style]},{default:()=>[n.default?g(Cn,{key:"content-defaults",defaults:{VImg:{cover:!0,src:t.image},VIcon:{icon:t.icon}}},{default:()=>[n.default()]}):t.image?g(ul,{key:"image",src:t.image,alt:"",cover:!0},null):t.icon?g(Si,{key:"icon",icon:t.icon},null):t.text,Ga(!1,"v-avatar")]})),{}}}),Fp=D({appendAvatar:String,appendIcon:Ze,prependAvatar:String,prependIcon:Ze,subtitle:{type:[String,Number,Boolean],default:void 0},title:{type:[String,Number,Boolean],default:void 0},...ee(),...Cs()},"VCardItem"),Bp=X()({name:"VCardItem",props:Fp(),setup(t,e){let{slots:n}=e;return re(()=>{var c;const i=!!(t.prependAvatar||t.prependIcon),s=!!(i||n.prepend),r=!!(t.appendAvatar||t.appendIcon),o=!!(r||n.append),a=!!(t.title!=null||n.title),l=!!(t.subtitle!=null||n.subtitle);return g("div",{class:["v-card-item",t.class],style:t.style},[s&&g("div",{key:"prepend",class:"v-card-item__prepend"},[n.prepend?g(Cn,{key:"prepend-defaults",disabled:!i,defaults:{VAvatar:{density:t.density,image:t.prependAvatar},VIcon:{density:t.density,icon:t.prependIcon}}},n.prepend):g(Zt,null,[t.prependAvatar&&g(xr,{key:"prepend-avatar",density:t.density,image:t.prependAvatar},null),t.prependIcon&&g(Si,{key:"prepend-icon",density:t.density,icon:t.prependIcon},null)])]),g("div",{class:"v-card-item__content"},[a&&g(Rp,{key:"title"},{default:()=>{var u;return[((u=n.title)==null?void 0:u.call(n))??ks(t.title)]}}),l&&g(Ap,{key:"subtitle"},{default:()=>{var u;return[((u=n.subtitle)==null?void 0:u.call(n))??ks(t.subtitle)]}}),(c=n.default)==null?void 0:c.call(n)]),o&&g("div",{key:"append",class:"v-card-item__append"},[n.append?g(Cn,{key:"append-defaults",disabled:!r,defaults:{VAvatar:{density:t.density,image:t.appendAvatar},VIcon:{density:t.density,icon:t.appendIcon}}},n.append):g(Zt,null,[t.appendIcon&&g(Si,{key:"append-icon",density:t.density,icon:t.appendIcon},null),t.appendAvatar&&g(xr,{key:"append-avatar",density:t.density,image:t.appendAvatar},null)])])])}),{}}}),Vp=D({opacity:[Number,String],...ee(),...He()},"VCardText"),$p=X()({name:"VCardText",props:Vp(),setup(t,e){let{slots:n}=e;return re(()=>g(t.tag,{class:["v-card-text",t.class],style:[{"--v-card-text-opacity":t.opacity},t.style]},n)),{}}}),Wp=D({appendAvatar:String,appendIcon:Ze,disabled:Boolean,flat:Boolean,hover:Boolean,image:String,link:{type:Boolean,default:void 0},prependAvatar:String,prependIcon:Ze,ripple:{type:[Boolean,Object],default:!0},subtitle:{type:[String,Number,Boolean],default:void 0},text:{type:[String,Number,Boolean],default:void 0},title:{type:[String,Number,Boolean],default:void 0},...Ha(),...ee(),...Cs(),...Di(),...ip(),...hp(),...Ja(),...gp(),...Vn(),...Cp(),...He(),...wn(),...Ya({variant:"elevated"})},"VCard"),Jp=X()({name:"VCard",directives:{Ripple:Tp},props:Wp(),setup(t,e){let{attrs:n,slots:i}=e;const{themeClasses:s}=Ri(t),{borderClasses:r}=za(t),{colorClasses:o,colorStyles:a,variantClasses:l}=Ka(t),{densityClasses:c}=ja(t),{dimensionStyles:u}=Pi(t),{elevationClasses:d}=sp(t),{loaderClasses:h}=fp(t),{locationStyles:f}=Za(t),{positionClasses:p}=mp(t),{roundedClasses:b}=$n(t),T=yp(t,n);return re(()=>{const W=t.link!==!1&&T.isLink.value,j=!t.disabled&&t.link!==!1&&(t.link||T.isClickable.value),q=W?"a":t.tag,$=!!(i.title||t.title!=null),me=!!(i.subtitle||t.subtitle!=null),Ge=$||me,ve=!!(i.append||t.appendAvatar||t.appendIcon),ht=!!(i.prepend||t.prependAvatar||t.prependIcon),ye=!!(i.image||t.image),ft=Ge||ht||ve,Re=!!(i.text||t.text!=null);return ii(g(q,xi({class:["v-card",{"v-card--disabled":t.disabled,"v-card--flat":t.flat,"v-card--hover":t.hover&&!(t.disabled||t.flat),"v-card--link":j},s.value,r.value,o.value,c.value,d.value,h.value,p.value,b.value,l.value,t.class],style:[a.value,u.value,f.value,t.style],onClick:j&&T.navigate,tabindex:t.disabled?-1:void 0},T.linkProps),{default:()=>{var w;return[ye&&g("div",{key:"image",class:"v-card__image"},[i.image?g(Cn,{key:"image-defaults",disabled:!t.image,defaults:{VImg:{cover:!0,src:t.image}}},i.image):g(ul,{key:"image-img",cover:!0,src:t.image},null)]),g(_p,{name:"v-card",active:!!t.loading,color:typeof t.loading=="boolean"?void 0:t.loading},{default:i.loader}),ft&&g(Bp,{key:"item",prependAvatar:t.prependAvatar,prependIcon:t.prependIcon,title:t.title,subtitle:t.subtitle,appendAvatar:t.appendAvatar,appendIcon:t.appendIcon},{default:i.item,prepend:i.prepend,title:i.title,subtitle:i.subtitle,append:i.append}),Re&&g($p,{key:"text"},{default:()=>{var x;return[((x=i.text)==null?void 0:x.call(i))??t.text]}}),(w=i.default)==null?void 0:w.call(i),i.actions&&g(kp,null,{default:i.actions}),Ga(j,"v-card")]}}),[[Wr("ripple"),j&&t.ripple]])}),{}}}),Up=D({fluid:{type:Boolean,default:!1},...ee(),...Di(),...He()},"VContainer"),Zp=X()({name:"VContainer",props:Up(),setup(t,e){let{slots:n}=e;const{rtlClasses:i}=Ai(),{dimensionStyles:s}=Pi(t);return re(()=>g(t.tag,{class:["v-container",{"v-container--fluid":t.fluid},i.value,t.class],style:[s.value,t.style]},n)),{}}});export{Jp as A,Rp as B,kp as C,Zp as D,zp as E,Xp as F,Qp as G,Kp as H,Op as I,Wa as J,Gp as K,_p as L,Kt as M,qp as N,jp as O,Lt as P,Yp as Q,Tp as R,$p as S,ul as T,Si as V,Vn as a,ip as b,Cs as c,Ha as d,za as e,sp as f,$n as g,Xa as h,qa as i,cp as j,Qa as k,fp as l,Ya as m,Za as n,mp as o,yp as p,Ka as q,Cp as r,gp as s,Ja as t,ja as u,hp as v,Ga as w,Cn as x,Dp as y,Jt as z};
