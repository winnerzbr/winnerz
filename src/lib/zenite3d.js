// @ts-nocheck
function showErr(m){console.warn(m)}
/* Troféu Zênite em 3D (WebGL puro, sem biblioteca).
   - Modelo: /modelos/zenite.bin, preparado a partir do .glb do dono (scripts em prototipos/awards-cena/preparo/).
     Cada vértice traz a posição, a normal, o material (0 ouro, 1 prata, 2 diamante, 3 logo) e o quanto ele balança ao vento.
   - A bandeira e o manto balançam no sombreador de vértices. A base de diamante é desenhada por cima do ouro,
     lendo uma imagem do que está atrás com desvio por faceta (transparência e refração).
   - Com "reduzir movimento" ligado, o vento para. O desenho pausa quando a tela não está visível. */
const MV=`attribute vec4 aA;attribute vec4 aB;uniform mat4 uVP;uniform float uT;
varying vec3 vN;varying vec3 vW;varying float vM;varying float vC;
const vec3 WD=vec3(.938,0.,-.346);const vec3 DD=vec3(.346,0.,.938);
void main(){vec3 p=aA.xyz*6.;float w=aA.w;vec3 n=normalize(aB.xyz);
float ph=dot(p,WD)*4.2-uT*3.4+p.y*1.3;float g=.74+.26*sin(uT*.6+p.y*.4);
float fl=w*w*sin(ph*4.1-uT*4.5)*.028;float d=w*g*(sin(ph)*.18+sin(ph*2.3+1.7)*.06)+fl;float sl=w*g*(cos(ph)*.76+cos(ph*2.3+1.7)*.58)+w*w*cos(ph*4.1-uT*4.5)*.48;
p+=DD*d;p.y+=w*g*cos(ph*.5)*.055;p+=WD*w*g*sin(ph*.5+1.)*.03;n=normalize(n-WD*sl*dot(n,DD));
vW=p;vN=n;vM=aB.w*127.;vC=w;gl_Position=uVP*vec4(p,1.);}`;
const MF=`precision highp float;varying vec3 vN;varying vec3 vW;varying float vM;varying float vC;uniform vec3 uCam;uniform float uT;uniform float uSel;uniform float uLit;uniform float uFill;uniform sampler2D uScn;uniform vec2 uRes;uniform vec3 uRt;uniform vec3 uUp;
float dia(vec3 d){float s=pow(max(dot(d,normalize(vec3(.5,.7,.4))),0.),60.)*6.+pow(max(dot(d,normalize(vec3(-.6,.5,.6))),0.),80.)*6.+pow(max(dot(d,normalize(vec3(.1,.2,-1.))),0.),50.)*4.+pow(max(dot(d,normalize(vec3(-.2,-.8,.5))),0.),70.)*4.+pow(max(dot(d,normalize(vec3(.8,-.1,.5))),0.),90.)*5.;
 s+=smoothstep(.9,.99,sin(d.x*9.+d.y*6.+d.z*4.))*.5;return s;}
vec3 env(vec3 r){float y=r.y;vec3 c=mix(vec3(.035,.022,.012),vec3(.95,.74,.44),smoothstep(-.35,.95,y));
c+=vec3(1.,.96,.88)*pow(max(dot(r,normalize(vec3(.5,.7,.4))),0.),26.)*3.2;
c+=vec3(1.,.9,.75)*pow(max(dot(r,normalize(vec3(-.3,.5,.8))),0.),60.)*2.2;
c+=vec3(.5,.62,.95)*pow(max(dot(r,normalize(vec3(-.7,.2,-.5))),0.),7.)*.8;
c+=vec3(1.,.82,.5)*smoothstep(.8,1.,sin(r.x*7.+r.y*3.+r.z*2.))*.28;
c+=vec3(.9,.7,.45)*smoothstep(.1,0.,abs(y+.05))*.25;return c;}
void main(){vec3 n=normalize(vN);vec3 v=normalize(uCam-vW);if(dot(n,v)<0.)n=-n;vec3 r=reflect(-v,n);float nv=max(dot(n,v),0.);float fr=pow(1.-nv,4.);
float al=1.;vec3 col;
if(vM>1.5&&vM<2.5){vec3 q=floor(n*23.+.5);vec3 hh=fract(sin(vec3(dot(q,vec3(12.9,78.2,37.7)),dot(q,vec3(39.3,11.1,83.2)),dot(q,vec3(73.2,52.2,9.4))))*43758.5);vec3 nr=normalize(n+.9*(hh-.5));
 vec2 uv=gl_FragCoord.xy/uRes;vec2 of=vec2(dot(n,uRt),dot(n,uUp))*vec2(uRes.y/uRes.x,1.)*.075+(hh.xy-.5)*.012;float lg=smoothstep(.3,.75,length((vW.xy-vec2(-.73,.38))*vec2(1.,1.5)))+smoothstep(.3,.0,vW.z);lg=clamp(lg,.12,1.);of*=lg;
 vec4 s1=texture2D(uScn,uv-of*.72),s2=texture2D(uScn,uv-of),s3=texture2D(uScn,uv-of*1.28);
 vec3 refr=vec3(s1.r*s1.a,s2.g*s2.a,s3.b*s3.a);float ra=max(s1.a,max(s2.a,s3.a));
 vec3 dr=reflect(refract(-v,n,.40),nr),dg=reflect(refract(-v,n,.415),nr),db=reflect(refract(-v,n,.43),nr);
 vec3 fire=vec3(dia(dr),dia(dg),dia(db));float sf=dia(r);
 float fl=smoothstep(.2,.0,abs(fract(dot(nr,v)*2.6+hh.z)-.5)-.12);fl*=lg;vec3 hue=.5+.5*cos(6.283*(hh.y+dot(nr,v)*.8+vec3(0.,.33,.67)));
 vec3 gli=fire*.6+vec3(sf)*(.06+fr*1.1)+mix(vec3(1.),hue,.45)*fl*(.12+.4*hh.x)+vec3(.8,.9,1.)*(.05+.08*hh.z)+vec3(1.,.8,.5)*fr*.25;
 float gm=max(gli.r,max(gli.g,gli.b));
 col=refr*vec3(.96,.98,1.04)*(1.-.25*fl)+gli;al=clamp(max(ra*.97,.08+gm*.8+fr*.4),0.,1.);
 float lum=max(col.r,max(col.g,col.b));col=col/max(lum,1.)*min(lum,1.5);col=mix(col/max(al,.3),col,ra);col=min(col,vec3(1.5));}
else{vec3 base=vM<.5?vec3(1.,.7,.3):(vM<1.5?vec3(.93,.95,.99):vec3(1.,.72,.32));
 col=base*(env(r)*1.25+uFill)+fr*vec3(1.,.95,.9)*.4;col*=.82+.18*smoothstep(0.,.5,nv);}
if(uSel>-.5&&abs(vM-uSel)>.5)col*=.14;
col*=uLit;gl_FragColor=vec4(col,al);}`;
function mkSh(gl,t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){showErr(gl.getShaderInfoLog(o));return null}return o}
function mkPr(gl,v,f){const a=mkSh(gl,gl.VERTEX_SHADER,v),b=mkSh(gl,gl.FRAGMENT_SHADER,f);if(!a||!b)return null;const p=gl.createProgram();gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){showErr(gl.getProgramInfoLog(p));return null}return p}
const v3={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}};
const M4={persp(f,a,n,r){const t=1/Math.tan(f/2);return[t/a,0,0,0,0,t,0,0,0,0,(r+n)/(n-r),-1,0,0,2*r*n/(n-r),0]},
 look(e,c,u){const z=v3.norm(v3.sub(e,c)),x=v3.norm(v3.cross(u,z)),y=v3.cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-v3.dot(x,e),-v3.dot(y,e),-v3.dot(z,e),1]},
 mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o},
 proj(m,p){const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return[x/w,y/w,w]}};


let modelP=null;
function loadModel(){
  if(!modelP)modelP=fetch('/modelos/zenite.bin').then(r=>{if(!r.ok)throw new Error('modelo');return r.arrayBuffer()}).then(b=>{
    const h=new Uint32Array(b,0,3),nv=h[1],ni=h[2];
    const M={A:new Int16Array(b,12,nv*4),B:new Int8Array(b,12+nv*8,nv*4),I:new Uint32Array(b,12+nv*12,ni),G:[]};
    let m0=-1;for(let k=0;k<ni;k+=3){const m=M.B[M.I[k]*4+3];if(m!==m0){M.G.push([m,k,0]);m0=m}M.G[M.G.length-1][2]+=3}
    return M}).catch(e=>{modelP=null;throw e});
  return modelP;
}
function drawR(R,MODEL,T,eye,ct,x0,wf,sel,lit=1,fill=0){const{c,gl,P}=R;const r=c.getBoundingClientRect(),dp=Math.min(devicePixelRatio||1,1.5),w=Math.max(2,Math.round(r.width*dp)),h=Math.max(2,Math.round(r.height*dp));if(c.width!==w||c.height!==h){c.width=w;c.height=h}
 const vw=Math.round(w*wf);
 const vp=M4.mul(M4.persp(.6,vw/h,.1,60),M4.look(eye,ct,[0,1,0]));const cz=v3.norm(v3.sub(eye,ct)),cx=v3.norm(v3.cross([0,1,0],cz)),cy=v3.cross(cz,cx);
 if(R.fw!==w||R.fh!==h){R.fw=w;R.fh=h;if(!R.fb){R.fb=gl.createFramebuffer();R.ft=gl.createTexture();R.fd=gl.createRenderbuffer()}
  gl.bindTexture(gl.TEXTURE_2D,R.ft);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindRenderbuffer(gl.RENDERBUFFER,R.fd);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
  gl.bindFramebuffer(gl.FRAMEBUFFER,R.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,R.ft,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,R.fd);gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
 gl.useProgram(P);const la=gl.getAttribLocation(P,'aA'),lb=gl.getAttribLocation(P,'aB');const U=n=>gl.getUniformLocation(P,n);
 gl.bindBuffer(gl.ARRAY_BUFFER,R.a);gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,4,gl.SHORT,true,8,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,R.b);gl.enableVertexAttribArray(lb);gl.vertexAttribPointer(lb,4,gl.BYTE,true,4,0);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,R.i);
 gl.uniformMatrix4fv(U('uVP'),false,new Float32Array(vp));gl.uniform1f(U('uT'),T);gl.uniform3f(U('uCam'),eye[0],eye[1],eye[2]);gl.uniform1f(U('uSel'),sel);gl.uniform1f(U('uLit'),lit);gl.uniform1f(U('uFill'),fill);
 gl.uniform2f(U('uRes'),w,h);gl.uniform3f(U('uRt'),cx[0],cx[1],cx[2]);gl.uniform3f(U('uUp'),cy[0],cy[1],cy[2]);gl.uniform1i(U('uScn'),0);
 const solid=()=>{gl.viewport(Math.round(w*x0),0,vw,h);gl.clearColor(0,0,0,0);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);for(const[m,o,n]of MODEL.G)if(m!==2)gl.drawElements(gl.TRIANGLES,n,gl.UNSIGNED_INT,o*4)};
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);gl.bindFramebuffer(gl.FRAMEBUFFER,R.fb);solid();gl.bindFramebuffer(gl.FRAMEBUFFER,null);solid();
 gl.bindTexture(gl.TEXTURE_2D,R.ft);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);for(const[m,o,n]of MODEL.G)if(m===2)gl.drawElements(gl.TRIANGLES,n,gl.UNSIGNED_INT,o*4);gl.depthMask(true);gl.disable(gl.BLEND)}

/** Liga o troféu a um canvas. `view(dt, t, largura, altura)` devolve a câmera de cada quadro (ou null para não desenhar).
 *  Devolve a função que desliga tudo. `onReady` avisa quando o modelo chegou; `onFail`, se não der para desenhar. */
export function mountZenite(canvas,view,onReady,onFail){
  let gl=null;try{gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false})}catch(e){}
  if(!gl||!gl.getExtension('OES_element_index_uint')){onFail&&onFail();return()=>{}}
  const P=mkPr(gl,MV,MF);if(!P){onFail&&onFail();return()=>{}}
  const R={c:canvas,gl,P,ok:false};let MODEL=null,alive=true,vis=true,T=0,last=performance.now(),raf=0;
  const calm=(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)||document.documentElement.dataset.motion==='reduzidas';
  loadModel().then(M=>{if(!alive)return;MODEL=M;
    R.a=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.a);gl.bufferData(gl.ARRAY_BUFFER,M.A,gl.STATIC_DRAW);
    R.b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.b);gl.bufferData(gl.ARRAY_BUFFER,M.B,gl.STATIC_DRAW);
    R.i=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,R.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,M.I,gl.STATIC_DRAW);R.ok=true;onReady&&onReady()}).catch(()=>{onFail&&onFail()});
  let io=null;try{io=new IntersectionObserver(es=>{for(const e of es)vis=e.isIntersecting});io.observe(canvas)}catch(e){}
  const loop=now=>{if(!alive)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
    if(!R.ok||!vis||document.hidden)return;const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return;if(!calm)T+=dt;
    const v=view(dt,T,r.width,r.height);if(v)drawR(R,MODEL,T,v.eye,v.ct,v.x0||0,v.wf||1,v.sel==null?-1:v.sel,v.lit||1,v.fill||0)};
  raf=requestAnimationFrame(loop);
  return()=>{alive=false;cancelAnimationFrame(raf);io&&io.disconnect();const x=gl.getExtension('WEBGL_lose_context');x&&x.loseContext()};
}
