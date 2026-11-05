const menu = document.querySelector('.menu');
const nav = document.querySelector('#navigation');
menu.addEventListener('click', () => {const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open);});
nav.addEventListener('click', event => {if(event.target.closest('a')){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown', event => {if(event.key === 'Escape' && nav.classList.contains('open')){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.focus();}});
const domains = {
people:['PERSONAS','El sistema empieza<br>con quienes lo usan.','Observamos cómo trabaja el equipo: qué necesita, qué decide y qué tiene que resolver para que la operación siga.','¿La herramienta se adapta a las personas o las personas a la herramienta?'],
process:['PROCESOS','El trabajo necesita<br>un camino claro.','Seguimos el recorrido del trabajo: sus pasos, responsables, decisiones y traspasos. Ahí aparecen las esperas y los esfuerzos que se repiten.','¿Dónde se detiene el trabajo y qué necesita para seguir?'],
tools:['HERRAMIENTAS','La mejor herramienta<br>deja espacio para pensar.','Revisamos qué aporta cada herramienta, cómo se utiliza y cómo se conecta con el resto. Su valor se entiende en el trabajo cotidiano.','¿Ayuda a resolver el trabajo o añade otra tarea?'],
information:['INFORMACIÓN','La claridad también<br>se diseña.','Miramos cómo se captura, comparte y transforma la información para que llegue a la persona adecuada cuando tiene que decidir.','¿El equipo puede confiar en lo que está viendo?'],
direction:['DIRECCIÓN','Avanzar requiere<br>un sentido compartido.','Conectamos las decisiones del día a día con lo que el equipo busca lograr. Aclaramos prioridades, criterios y señales de avance.','¿Todos entienden qué importa y por qué?']};
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activate(tab){tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;});const data=domains[tab.dataset.domain];document.querySelector('#domain-panel').setAttribute('aria-labelledby',tab.id);document.querySelector('#domain-subtitle').textContent=data[0];document.querySelector('#domain-title').innerHTML=data[1];document.querySelector('#domain-description').textContent=data[2];document.querySelector('#domain-question').textContent=data[3];}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowDown'||e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowUp'||e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();activate(tabs[next]);tabs[next].focus();}});});
const particles=document.querySelector('#particles');for(let i=0;i<95;i++){const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');const angle=i*2.39996;const radius=25+Math.sqrt(i/95)*225;dot.setAttribute('cx',380+Math.cos(angle)*radius*1.2);dot.setAttribute('cy',295+Math.sin(angle)*radius*.8);dot.setAttribute('r',i%3===0?'1.1':'.6');particles.appendChild(dot);}

const legacy = {inicio:'contenido',nosotros:'firma',servicios:'metodo',soluciones:'metodo',socios:'firma',contacto:'conversemos'};
function resolveLegacy(){const target=legacy[location.hash.slice(1)];if(target)document.getElementById(target)?.scrollIntoView();}
window.addEventListener('hashchange',resolveLegacy);resolveLegacy();
