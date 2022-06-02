/*! For license information please see main.6ce1889e.chunk.js.LICENSE.txt */
(this["webpackJsonpblockly-react-sample"]=this["webpackJsonpblockly-react-sample"]||[]).push([[0],{133:function(e,t,n){"use strict";n.r(t);var r=n(4),o=n(3),c=n.n(o),a=n(17),i=n.n(a),l=(n(65),n(13)),s=n(14),u=n(16),d=n(15),h=(n(66),n.p+"static/media/logo.103b5fa1.svg"),p=n(18),j=n(59),b=(n(67),n(5)),m=n.n(b),f=n(54),v=n.n(f),y=n(55),O=n.n(y);n(69);m.a.setLocale(v.a),m.a.setLocale(O.a);var _=function(e){Object(u.a)(n,e);var t=Object(d.a)(n);function n(e){var r;return Object(l.a)(this,n),(r=t.call(this,e)).blocklyDiv=c.a.createRef(),r.toolbox=c.a.createRef(),r}return Object(s.a)(n,[{key:"componentDidMount",value:function(){var e=this.props,t=e.initialXml,n=(e.children,Object(p.a)(e,["initialXml","children"]));this.primaryWorkspace=m.a.inject(this.blocklyDiv.current,Object(j.a)({toolbox:this.toolbox.current},n)),t&&m.a.Xml.domToWorkspace(m.a.Xml.textToDom(t),this.primaryWorkspace)}},{key:"setXml",value:function(e){m.a.Xml.domToWorkspace(m.a.Xml.textToDom(e),this.primaryWorkspace)}},{key:"render",value:function(){var e=this.props.children;return Object(r.jsxs)(c.a.Fragment,{children:[Object(r.jsx)("div",{ref:this.blocklyDiv,id:"blocklyDiv"}),Object(r.jsx)("xml",{xmlns:"https://developers.google.com/blockly/xml",is:"blockly",style:{display:"none"},ref:this.toolbox,children:e})]})}},{key:"workspace",get:function(){return this.primaryWorkspace}}]),n}(c.a.Component),k=function(e){var t=e.children,n=Object(p.a)(e,["children"]);return n.is="blockly",c.a.createElement("block",n,t)},x=function(e){var t=e.children,n=Object(p.a)(e,["children"]);return n.is="blockly",c.a.createElement("value",n,t)},g=function(e){var t=e.children,n=Object(p.a)(e,["children"]);return n.is="blockly",c.a.createElement("field",n,t)},w=function(e){var t=e.children,n=Object(p.a)(e,["children"]);return n.is="blockly",c.a.createElement("shadow",n,t)},D=n(39),C=n.n(D),A=function(e){Object(u.a)(n,e);var t=Object(d.a)(n);function n(){var e;Object(l.a)(this,n);for(var r=arguments.length,o=new Array(r),c=0;c<r;c++)o[c]=arguments[c];return(e=t.call.apply(t,[this].concat(o))).SERIALIZABLE=!0,e}return Object(s.a)(n,[{key:"showEditor_",value:function(){this.div_=b.DropDownDiv.getContentDiv(),i.a.render(this.render(),this.div_);var e=this.sourceBlock_.style.colourTertiary;e=e.colourBorder||e.colourLight,b.DropDownDiv.setColour(this.sourceBlock_.getColour(),e),b.DropDownDiv.showPositionedByField(this,this.dropdownDispose_.bind(this))}},{key:"dropdownDispose_",value:function(){i.a.unmountComponentAtNode(this.div_)}},{key:"render",value:function(){return Object(r.jsx)(E,{})}}],[{key:"fromJson",value:function(e){return new n(e.text)}}]),n}(b.Field),E=function(e){Object(u.a)(n,e);var t=Object(d.a)(n);function n(){return Object(l.a)(this,n),t.apply(this,arguments)}return Object(s.a)(n,[{key:"render",value:function(){return Object(r.jsx)("div",{style:{color:"#fff"},children:"Hello from React!"})}}]),n}(c.a.Component);b.fieldRegistry.register("field_react_component",A);var S=A,T=n(27),W=n(56),B=n.n(W),X=(n(72),function(e){Object(u.a)(n,e);var t=Object(d.a)(n);function n(){var e;Object(l.a)(this,n);for(var r=arguments.length,o=new Array(r),c=0;c<r;c++)o[c]=arguments[c];return(e=t.call.apply(t,[this].concat(o))).onDateSelected_=function(t){e.setValue(new Date(t)),b.DropDownDiv.hideIfOwner(Object(T.a)(e),!0)},e}return Object(s.a)(n,[{key:"getText_",value:function(){return this.value_.toLocaleDateString()}},{key:"fromXml",value:function(e){this.setValue(new Date(e.textContent))}},{key:"render",value:function(){return Object(r.jsx)(B.a,{selected:this.value_,onChange:this.onDateSelected_,inline:!0})}}],[{key:"fromJson",value:function(e){return new n(new Date(e.date))}}]),n}(S));b.fieldRegistry.register("field_react_date",X);var I={type:"test_react_field",message0:"custom field %1",args0:[{type:"field_react_component",name:"FIELD",text:"Click me"}],previousStatement:null,nextStatement:null};b.Blocks.test_react_field={init:function(){this.jsonInit(I),this.setStyle("loop_blocks")}};var L={type:"test_react_date_field",message0:"date field %1",args0:[{type:"field_react_date",name:"DATE",date:"01/01/2020"}],previousStatement:null,nextStatement:null};b.Blocks.test_react_date_field={init:function(){this.jsonInit(L),this.setStyle("loop_blocks")}},b.JavaScript.test_react_field=function(e){return"console.log('custom block');\n"},b.JavaScript.test_react_date_field=function(e){return"console.log("+e.getField("DATE").getText()+");\n"};var R=function(e){Object(u.a)(n,e);var t=Object(d.a)(n);function n(e){var r;return Object(l.a)(this,n),(r=t.call(this,e)).generateCode=function(){var e=C.a.workspaceToCode(r.simpleWorkspace.current.workspace);console.log(e)},r.simpleWorkspace=c.a.createRef(),r}return Object(s.a)(n,[{key:"render",value:function(){return Object(r.jsx)("div",{className:"App",children:Object(r.jsxs)("header",{className:"App-header",children:[Object(r.jsx)("img",{src:h,className:"App-logo",alt:"logo"}),Object(r.jsx)("button",{onClick:this.generateCode,children:"Convert"}),Object(r.jsxs)(_,{ref:this.simpleWorkspace,readOnly:!1,trashcan:!0,media:"media/",move:{scrollbars:!0,drag:!0,wheel:!0},initialXml:'\n<xml xmlns="http://www.w3.org/1999/xhtml">\n<block type="controls_ifelse" x="0" y="0"></block>\n</xml>\n      ',children:[Object(r.jsx)(k,{type:"test_react_field"}),Object(r.jsx)(k,{type:"test_react_date_field"}),Object(r.jsx)(k,{type:"controls_ifelse"}),Object(r.jsx)(k,{type:"logic_compare"}),Object(r.jsx)(k,{type:"logic_operation"}),Object(r.jsx)(k,{type:"controls_repeat_ext",children:Object(r.jsx)(x,{name:"TIMES",children:Object(r.jsx)(w,{type:"math_number",children:Object(r.jsx)(g,{name:"NUM",children:"10"})})})}),Object(r.jsx)(k,{type:"logic_operation"}),Object(r.jsx)(k,{type:"logic_negate"}),Object(r.jsx)(k,{type:"logic_boolean"}),Object(r.jsx)(k,{type:"logic_null",disabled:"true"}),Object(r.jsx)(k,{type:"logic_ternary"}),Object(r.jsx)(k,{type:"text_charAt",children:Object(r.jsx)(x,{name:"VALUE",children:Object(r.jsx)(k,{type:"variables_get",children:Object(r.jsx)(g,{name:"VAR",children:"text"})})})})]})]})})}}]),n}(c.a.Component);Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));i.a.render(Object(r.jsx)(R,{}),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()}))},65:function(e,t,n){},66:function(e,t,n){},67:function(e,t,n){}},[[133,1,2]]]);
//# sourceMappingURL=main.6ce1889e.chunk.js.map