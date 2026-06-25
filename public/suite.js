(async () => {
      const { createClient } = window.supabase;
      const SUPABASE_URL = 'https://cppplmloraanbnseqnka.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwcHBsbWxvcmFhbmJuc2VxbmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3Mjk5MjYsImV4cCI6MjA5NzMwNTkyNn0.Nw80dCvEqd2jmYo5pR1oVSfpDV2EQxV46W0YKuoOPbE';
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const state = { session:null, line:'salud', view:'dashboard', prospects:[], selected:null, status:'all', evaluations:{}, followups:{} };
      const lineLabels = { salud:'DIGITEM Salud', corem:'COREM', it:'DIGITEM IT' };
      const statusLabels = { prospecto:'Prospecto', prospeccion:'Prospección', evaluacion:'Evaluación', recomendacion:'Recomendación', objecion:'Objeción', seguimiento:'Seguimiento', cliente:'Cliente', descartado:'Descartado' };

      const el = (id) => document.getElementById(id);
      const $$ = (sel) => Array.from(document.querySelectorAll(sel));

      const { data } = await supabase.auth.getSession();
      state.session = data?.session;
      if (!state.session) window.location.href = '/suite/login';
      else el('userEmail').textContent = state.session.user?.email || 'usuario@digitem-mx.com';

      el('logoutButton')?.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = '/suite/login'; });

      async function loadProspects(){
        const { data, error } = await supabase.from('prospects').select('*').order('created_at',{ascending:false});
        if(error){ console.error(error); return; }
        state.prospects = data || [];
        renderAll();
      }

      async function loadLatestEvaluation(prospectId){
        if(!prospectId) return null;
        const { data, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending:false })
          .limit(1)
          .maybeSingle();
        if(error){ console.warn('No se pudo cargar la evaluación:', error.message); return null; }
        state.evaluations[prospectId] = data || null;
        return data || null;
      }

      async function loadFollowups(prospectId){
        if(!prospectId) return [];
        const { data, error } = await supabase
          .from('followups')
          .select('*')
          .eq('prospect_id', prospectId)
          .order('completed', { ascending:true })
          .order('due_date', { ascending:true, nullsFirst:false })
          .order('created_at', { ascending:false });
        if(error){ console.warn('No se pudieron cargar seguimientos:', error.message); state.followups[prospectId] = []; return []; }
        state.followups[prospectId] = data || [];
        return data || [];
      }

      function showToast(message, type='success'){
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'error' : ''}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
      }

      function setView(view){
        state.view = view;
        $$('.view').forEach(v => v.classList.toggle('active', v.dataset.viewSection === view));
        $$('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        if(view === 'prospects') {
          el('pageTitle').textContent = `${lineLabels[state.line]} · Prospectos`;
          el('contextEyebrow').textContent = 'Operación contextual';
        } else if(view === 'knowledge') {
          el('pageTitle').textContent = 'Base de conocimiento.';
          el('contextEyebrow').textContent = 'Recursos operativos';
        } else {
          el('pageTitle').textContent = 'Centro operativo DIGITEM.';
          el('contextEyebrow').textContent = 'Owner · Todas las líneas';
        }
      }

      function setLine(line){
        state.line = line;
        setView('prospects');
        el('prospectLineLabel').textContent = lineLabels[line];
        renderProspects();
        $$('.nav-item[data-line]').forEach(n => n.classList.toggle('active', n.dataset.line === line));
      }

      function renderAll(){ renderMetrics(); renderProspects(); renderRecent(); }

      function renderMetrics(){
        const byLine = (line) => state.prospects.filter(p => p.business_line === line);
        el('saludCount').textContent = byLine('salud').length;
        el('coremCount').textContent = byLine('corem').length;
        el('itCount').textContent = byLine('it').length;
        el('saludPending').textContent = byLine('salud').filter(p => !['cliente','descartado'].includes(p.status)).length;
      }

      function renderRecent(){
        const container = el('recentActivity');
        const recent = state.prospects.slice(0,5);
        if(!recent.length){ container.textContent = 'Aún no hay actividad registrada.'; return; }
        container.innerHTML = recent.map(p => `<article class="activity-row"><span>${lineLabels[p.business_line] || p.business_line}</span><strong>${escapeHtml(p.name)}</strong><small>${statusLabels[p.status] || p.status}</small></article>`).join('');
      }

      function renderProspects(){
        const list = el('prospectsList');
        const filtered = state.prospects.filter(p => p.business_line === state.line && (state.status === 'all' || p.status === state.status));
        if(!filtered.length){ list.innerHTML = `<div class="empty-list">No hay prospectos en ${lineLabels[state.line]}.</div>`; renderSelected(); return; }
        list.innerHTML = filtered.map(p => `<button class="prospect-item ${state.selected?.id === p.id ? 'active':''}" data-id="${p.id}" type="button"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.business_name || 'Sin empresa')}</span><small>${statusLabels[p.status] || p.status}</small></button>`).join('');
        list.querySelectorAll('[data-id]').forEach(btn => btn.addEventListener('click', async () => {
          state.selected = state.prospects.find(p => p.id === btn.dataset.id);
          renderSelected();
          renderProspects();
          await Promise.all([loadLatestEvaluation(state.selected?.id), loadFollowups(state.selected?.id)]);
          renderSelected();
        }));
        if(!state.selected || state.selected.business_line !== state.line){
          state.selected = filtered[0];
          renderSelected();
          Promise.all([loadLatestEvaluation(state.selected?.id), loadFollowups(state.selected?.id)]).then(() => renderSelected());
        }
      }

      function renderSelected(){
        const box = el('prospectWorkspace');
        const p = state.selected;
        if(!p){
          box.innerHTML = `<div class="empty-prospect"><p class="eyebrow">Sin prospecto seleccionado</p><h2>Selecciona una oportunidad.</h2><p>El entorno contextual aparecerá aquí: datos del prospecto, siguiente paso, herramienta recomendada y base de conocimiento.</p><button class="primary" type="button" data-open-prospect>Crear prospecto</button></div>`;
          box.querySelector('[data-open-prospect]')?.addEventListener('click', openProspectDialog);
          return;
        }
        box.innerHTML = `
          <article class="prospect-profile-shell">
            <div class="profile-hero">
              <div>
                <p class="eyebrow">${lineLabels[p.business_line]}</p>
                <h2>${escapeHtml(p.name)}</h2>
                <p>${escapeHtml(p.business_name || 'Sin empresa registrada')}</p>
              </div>
              <div class="profile-controls">
                <label class="status-label"><span>Estado actual</span><select id="statusSelect">${Object.entries(statusLabels).map(([key,label]) => `<option value="${key}" ${p.status === key ? 'selected':''}>${label}</option>`).join('')}</select></label>
                <button class="ghost-button" type="button" data-kb-open="script">Base de conocimiento</button>
                <button class="danger-lite" type="button" data-delete-prospect="${p.id}">Eliminar prospecto</button>
              </div>
            </div>

            <div class="progress-strip">
              ${['prospeccion','evaluacion','recomendacion','objecion','seguimiento','cliente'].map((s,i) => `<button type="button" class="progress-step ${pipelineActive(p.status,s)}" data-status-to="${s}"><span>${String(i+1).padStart(2,'0')}</span>${statusLabels[s]}</button>`).join('')}
            </div>

            <div class="profile-grid">
              <section class="profile-panel contact-panel">
                <p class="eyebrow">Ficha rápida</p>
                <div class="contact-list">
                  <p><span>WhatsApp</span><strong>${escapeHtml(p.whatsapp || '—')}</strong></p>
                  <p><span>Instagram</span><strong>${escapeHtml(p.instagram || '—')}</strong></p>
                  <p><span>Sitio web</span><strong>${escapeHtml(p.website || '—')}</strong></p>
                  <p><span>Zona</span><strong>${escapeHtml(p.city || '—')}</strong></p>
                </div>
              </section>

              <section class="profile-panel next-panel contextual-next">
                <p class="eyebrow">Siguiente paso</p>
                <h3>${suggestedTitle(p.status)}</h3>
                <p>${suggestedCopy(p.status)}</p>
                ${nextContextBlock(p.status)}
              </section>
            </div>
          </article>

          <section class="tool-panel" id="toolPanel"></section>
        `;
        box.querySelector('#statusSelect')?.addEventListener('change', async (e) => updateStatus(p.id, e.target.value));
        box.querySelectorAll('[data-tool]').forEach(btn => btn.addEventListener('click', () => renderTool(btn.dataset.tool)));
        box.querySelectorAll('[data-status-to]').forEach(btn => btn.addEventListener('click', () => updateStatus(p.id, btn.dataset.statusTo)));
        box.querySelectorAll('[data-kb-open]').forEach(btn => btn.addEventListener('click', () => openKb(btn.dataset.kbOpen)));
        box.querySelectorAll('[data-delete-prospect]').forEach(btn => btn.addEventListener('click', () => openDeleteProspectDialog(p)));
        renderTool(defaultTool(p.status));
      }

      function pipelineActive(current, step){
        const order = ['prospeccion','evaluacion','recomendacion','objecion','seguimiento','cliente'];
        return order.indexOf(step) <= order.indexOf(current) ? 'active' : '';
      }
      function defaultTool(status){ if(status === 'evaluacion') return 'evaluation'; if(status === 'recomendacion') return 'recommendation'; if(status === 'objecion') return 'objections'; if(status === 'seguimiento') return 'followup'; if(status === 'cliente') return 'client'; return 'script'; }
      function suggestedTitle(status){ return ({prospecto:'Enviar mensaje de prospección', prospeccion:'Enviar mensaje de prospección', evaluacion:'Realizar Perspectiva Digital Express', recomendacion:'Enviar recomendación', objecion:'Responder objeción', seguimiento:'Dar seguimiento', cliente:'Cliente activo', descartado:'Prospecto descartado'})[status] || 'Continuar flujo'; }
      function suggestedCopy(status){ return ({prospecto:'Abre el script autorizado, cópialo y registra el resultado.', prospeccion:'Si acepta, avanza a evaluación. Si rechaza, usa respuestas suaves.', evaluacion:'Califica las 6 dimensiones clave y genera una recomendación clara.', recomendacion:'Comparte el resumen y registra si muestra interés.', objecion:'Elige una respuesta profesional sin presionar.', seguimiento:'Usa el mensaje según temperatura del lead.', cliente:'Registra próximos pasos de entrega.', descartado:'Conserva historial para referencia futura.'})[status] || ''; }
      function nextContextBlock(status){
        if(status === 'evaluacion') return `<div class="next-compact-note"><strong>Evalúa primero.</strong><span>El resumen se construye con la calificación y las observaciones.</span><button type="button" class="ghost-button pdf-trigger" data-tool="evaluation">Preparar reporte PDF</button></div>`;
        if(status === 'recomendacion') return `<div class="next-compact-note"><strong>Recomendación lista.</strong><span>Revisa el resumen generado y compártelo cuando tenga sentido.</span><button type="button" class="ghost-button pdf-trigger" data-tool="evaluation">Ver base para PDF</button></div>`;
        if(status === 'objecion') return `<div class="next-compact-note"><strong>Responde sin presionar.</strong><span>Las respuestas sugeridas aparecen abajo según el caso.</span></div>`;
        if(status === 'seguimiento') return `<div class="next-compact-note"><strong>Agenda el próximo contacto.</strong><span>Registra fecha, motivo y contexto para no perder la conversación.</span></div>`;
        if(status === 'cliente') return `<div class="next-compact-note"><strong>Inicia operación.</strong><span>El flujo cambia de venta a onboarding, cotización, producción y entrega.</span></div>`;
        return `<div class="next-compact-note"><strong>Trabaja con la herramienta de abajo.</strong><span>Usa el script, registra la respuesta y avanza el estado del prospecto.</span></div>`;
      }

      function renderTool(tool){
        const panel = el('toolPanel');
        if(!state.selected || !panel) return;
        if(tool === 'script') panel.innerHTML = scriptTool();
        if(tool === 'evaluation') panel.innerHTML = evaluationTool();
        if(tool === 'recommendation') panel.innerHTML = recommendationTool();
        if(tool === 'objections') panel.innerHTML = objectionsTool();
        if(tool === 'followup') panel.innerHTML = followupTool();
        if(tool === 'client') panel.innerHTML = clientTool();
        panel.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => copyText(btn.dataset.copy)));
        panel.querySelectorAll('[data-followup-toggle]').forEach(btn => btn.addEventListener('click', () => { const card = btn.closest('.followup-item'); if(!card) return; const open = card.classList.toggle('is-open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.innerHTML = open ? '👁️ Ocultar contexto' : '👁️ Ver contexto'; }));
        panel.querySelectorAll('[data-status-to]').forEach(btn => btn.addEventListener('click', () => updateStatus(state.selected.id, btn.dataset.statusTo)));
        panel.querySelectorAll('[data-kb-open]').forEach(btn => btn.addEventListener('click', () => openKb(btn.dataset.kbOpen)));
        panel.querySelector('#evaluationForm')?.addEventListener('submit', saveEvaluation);
        panel.querySelector('#generatePdfButton')?.addEventListener('click', generateDigitalReportPdf);
        if(panel.querySelector('#evaluationForm')){
          hydrateEvaluationForm(state.evaluations[state.selected?.id]);
          panel.querySelectorAll('#evaluationForm input, #evaluationForm textarea').forEach(input => input.addEventListener('input', () => { if(input.name === 'summary' || input.name === 'recommendation') input.dataset.edited = 'true'; updateEvaluationPreview(); }));
          updateEvaluationPreview();
        }
        panel.querySelector('#followupForm')?.addEventListener('submit', saveFollowup);
        panel.querySelectorAll('[data-followup-action]').forEach(btn => btn.addEventListener('click', () => updateFollowup(btn.dataset.followupId, btn.dataset.followupAction, btn.dataset.followupResult || null)));
        panel.querySelectorAll('[data-followup-delete]').forEach(btn => btn.addEventListener('click', () => {
          const f = (state.followups[state.selected?.id] || []).find(item => item.id === btn.dataset.followupDelete);
          if(f) openDeleteFollowupDialog(f);
        }));
        panel.querySelector('[data-clear-followup]')?.addEventListener('click', () => { panel.querySelector('#followupForm')?.reset(); hydrateSuggestedFollowupMessage(); });
        panel.querySelectorAll('[data-followup-template]').forEach(btn => btn.addEventListener('click', () => { const scenario = panel.querySelector('#followupScenario'); if(scenario){ scenario.value = btn.dataset.followupTemplate; hydrateSuggestedFollowupMessage(); } }));
        panel.querySelector('#followupScenario')?.addEventListener('change', hydrateSuggestedFollowupMessage);
        panel.querySelector('#followupChannel')?.addEventListener('change', hydrateSuggestedFollowupMessage);
      }

      function scriptText(){ return `Hola, buena tarde 👋

Soy Emma de DIGITEM-MX.

Estaba conociendo algunos perfiles y sitios web de profesionales de la salud en la zona y me encontré con tu trabajo. Me pareció muy interesante la forma en que presentas tus servicios.

Actualmente estamos ayudando a especialistas y consultorios a fortalecer su presencia digital para que las personas puedan entender mejor lo que hacen, generar confianza desde el primer contacto y encontrar una forma sencilla de comunicarse.

Me gustaría compartirte algunas observaciones y oportunidades de mejora que identifiqué al revisar tu presencia digital. Es un ejercicio breve, sin costo y sin compromiso; simplemente una perspectiva externa que puede ayudarte a detectar áreas de oportunidad.

🔎 Visibilidad en línea
🤝 Confianza y presentación profesional
💬 Facilidad de contacto para nuevos pacientes

Si te interesa, con gusto te comparto un resumen breve.`; }
      function scriptTool(){ return `<div class="tool-card workflow-card"><div class="tool-head"><div><p class="eyebrow">Paso 1 · Prospección</p><h3>Mensaje inicial autorizado</h3></div><button class="ghost-button" type="button" data-kb-open="script">Ver guía</button></div><textarea readonly rows="11">${scriptText()}</textarea><div class="action-buttons"><button data-copy="${encodeURIComponent(scriptText())}" type="button">Copiar script</button><button type="button" data-status-to="evaluacion">Aceptó · Pasar a evaluación</button><button type="button" data-status-to="objecion">Rechazó · Ver objeciones</button></div><p class="helper-note">Después de copiar el mensaje, registra el resultado de la conversación para avanzar el flujo del prospecto.</p></div>`; }
      const evaluationFields = [
        {name:'visibility_score', label:'Visibilidad local', short:'Visibilidad', tip:'Google, zona y especialidad.', action:'Optimizar Google Business Profile, zona y palabras clave locales.', icon:'📍', criteria:[
          {key:'maps', text:'Aparece en Google Maps o buscadores locales', success:'Aparece en Google Maps o buscadores locales', opportunity:'No se encontró una presencia local suficientemente visible en Google Maps o buscadores locales'},
          {key:'zone', text:'Tiene ubicación, ciudad o zona de atención clara', success:'Ubicación o zona de atención claramente identificable', opportunity:'La ubicación, ciudad o zona de atención podría comunicarse con mayor claridad'},
          {key:'specialty', text:'La especialidad se entiende rápidamente', success:'La especialidad se entiende rápidamente', opportunity:'La especialidad principal podría comunicarse mejor para facilitar el descubrimiento'}
        ]},
        {name:'trust_score', label:'Confianza', short:'Confianza', tip:'Señales de profesionalismo.', action:'Sumar señales de autoridad, fotografía profesional y mensajes humanos.', icon:'🤝', criteria:[
          {key:'reviews', text:'Tiene testimonios, reseñas o señales de validación', success:'Incluye señales de validación como reseñas o testimonios', opportunity:'Faltan testimonios, reseñas o señales de validación visibles'},
          {key:'photo', text:'Usa fotografía profesional o imagen humana confiable', success:'La imagen humana o profesional refuerza confianza', opportunity:'Agregar fotografía profesional o una imagen humana confiable fortalecería la percepción'},
          {key:'identity', text:'Mantiene identidad visual y tono consistentes', success:'La identidad visual y el tono se mantienen consistentes', opportunity:'La identidad visual y el tono podrían estandarizarse para transmitir mayor profesionalismo'}
        ]},
        {name:'clarity_score', label:'Claridad del servicio', short:'Claridad', tip:'Servicios y primer paso.', action:'Ordenar servicios, beneficios y primera sesión en secciones simples.', icon:'💬', criteria:[
          {key:'what', text:'Explica con claridad qué hace o qué atiende', success:'Explica con claridad qué hace o qué atiende', opportunity:'Conviene explicar con mayor claridad qué atiende y cómo ayuda'},
          {key:'forwho', text:'Explica para quién es el servicio', success:'El público objetivo del servicio se entiende bien', opportunity:'Se puede aclarar mejor para quién está diseñado el servicio'},
          {key:'next', text:'Indica el siguiente paso para agendar o iniciar', success:'El siguiente paso para iniciar o agendar es claro', opportunity:'El siguiente paso para agendar o iniciar debería quedar más evidente'}
        ]},
        {name:'whatsapp_score', label:'WhatsApp', short:'WhatsApp', tip:'Contacto simple en móvil.', action:'Hacer visible el CTA y usar mensajes prellenados con intención clara.', icon:'📲', criteria:[
          {key:'visible', text:'El botón o enlace de WhatsApp es visible', success:'El contacto por WhatsApp es visible', opportunity:'El botón o enlace de WhatsApp debería ser más visible'},
          {key:'mobile', text:'El acceso funciona bien desde móvil', success:'El acceso a WhatsApp funciona bien desde móvil', opportunity:'El acceso a WhatsApp desde móvil podría reducir más fricción'},
          {key:'cta', text:'El llamado a la acción es claro y directo', success:'El llamado a la acción es claro y directo', opportunity:'El llamado a la acción podría ser más claro y orientar mejor al paciente'}
        ]},
        {name:'professional_presence_score', label:'Presencia profesional', short:'Presencia', tip:'Diseño actual y competitivo.', action:'Mejorar consistencia visual, velocidad percibida y experiencia móvil.', icon:'🎨', criteria:[
          {key:'design', text:'El diseño se percibe actual y profesional', success:'El diseño se percibe actual y profesional', opportunity:'El diseño podría actualizarse para elevar la percepción profesional'},
          {key:'complete', text:'La información básica está completa', success:'La información básica está completa', opportunity:'La información básica debería completarse y organizarse mejor'},
          {key:'navigation', text:'La navegación es sencilla y sin fricción', success:'La navegación es sencilla y sin fricción', opportunity:'La navegación podría simplificarse para facilitar la toma de decisión'}
        ]},
        {name:'digital_authority_score', label:'Autoridad digital', short:'Autoridad', tip:'Contenido, trayectoria y respaldo.', action:'Publicar contenido útil, mostrar trayectoria, reseñas, certificaciones o testimonios relevantes.', icon:'🎓', criteria:[
          {key:'content', text:'Publica contenido útil o educativo', success:'Publica contenido útil o educativo', opportunity:'Publicar contenido educativo ayudaría a construir autoridad'},
          {key:'experience', text:'Muestra experiencia, enfoque o trayectoria', success:'Muestra experiencia, enfoque o trayectoria', opportunity:'Mostrar experiencia, enfoque o trayectoria fortalecería la confianza'},
          {key:'proof', text:'Incluye respaldos como certificaciones, casos, reseñas o testimonios', success:'Incluye respaldos como certificaciones, casos, reseñas o testimonios', opportunity:'Agregar respaldos como certificaciones, casos, reseñas o testimonios elevaría la credibilidad'}
        ]}
      ];

      function criteriaCard(field){
        const boxes = field.criteria.map((item) => {
          const key = item.key;
          const text = item.text;
          return `<label class="criteria-check"><input type="checkbox" name="${field.name}_criteria" value="${key}" data-label="${escapeHtml(text)}" /> <span>${escapeHtml(text)}</span></label>`;
        }).join('');
        return `<fieldset class="score-card criteria-card" data-score-name="${field.name}"><div class="score-card-head"><legend>${field.label}</legend><small>${field.tip}</small></div><div class="criteria-list">${boxes}</div><div class="criteria-result"><strong data-criteria-count="${field.name}">0 de 3 criterios</strong><span data-criteria-score="${field.name}">Resultado: 0/2</span></div></fieldset>`;
      }

      function getFieldEvaluation(form, field){
        const checked = form.getAll(`${field.name}_criteria`);
        const score = checked.length === 0 ? 0 : checked.length < 3 ? 1 : 2;
        const checkedKeys = new Set(checked);
        const completed = [];
        const missing = [];
        field.criteria.forEach((item) => {
          const hit = { key:item.key, text:item.text, title:item.text, success:item.success || item.text, opportunity:item.opportunity || item.text, icon:field.icon || '•', category:field.label };
          if(checkedKeys.has(item.key)) completed.push(hit);
          else missing.push(hit);
        });
        return { value: score, completed, missing, checkedCount: checked.length, checkedKeys: Array.from(checkedKeys) };
      }

      function getEvaluationResult(form){
        const positives=[]; const opportunities=[]; const priorities=[]; const scores=[]; const positiveFindings=[]; const opportunityFindings=[]; let total=0; let completedCriteria=0;
        evaluationFields.forEach((field) => {
          const evaluation = getFieldEvaluation(form, field);
          const value = evaluation.value;
          total += value;
          completedCriteria += evaluation.checkedCount;
          evaluation.completed.forEach(item => positiveFindings.push({ icon:item.icon, title:item.success, category:field.label, description:item.success }));
          evaluation.missing.forEach(item => opportunityFindings.push({ icon:item.icon, title:item.opportunity, category:field.label, description:item.opportunity }));
          const completedText = evaluation.completed.map(x => x.success).join(', ');
          const missingText = evaluation.missing.map(x => x.opportunity).join(', ');
          scores.push({ name: field.name, label: field.label, short: field.short, value, action: field.action, completed: evaluation.completed, missing: evaluation.missing, checkedCount: evaluation.checkedCount, checkedKeys: evaluation.checkedKeys, icon: field.icon });
          if(evaluation.completed.length) positives.push(`${field.label}: ${completedText}.`);
          if(evaluation.missing.length) { opportunities.push(`${field.label}: ${missingText}.`); priorities.push({ label: field.label, action: field.action, value, missing: evaluation.missing }); }
        });
        const level = total <= 3 ? 'Presencia inicial' : total <= 6 ? 'En desarrollo' : total <= 10 ? 'Buena base digital' : 'Presencia sólida';
        const mainStrength = scores.slice().sort((a,b)=>b.value-a.value || b.checkedCount-a.checkedCount)[0];
        const mainOpportunity = scores.slice().sort((a,b)=>a.value-b.value || a.checkedCount-b.checkedCount)[0];
        const summary = `Puntaje: ${total}/12 · ${level}
Cumplimiento: ${completedCriteria}/18 criterios

Aspectos positivos:
${positiveFindings.length ? positiveFindings.slice(0,7).map(x=>'• '+x.title).join('\n') : '• Hay una base inicial para comenzar a ordenar la presencia digital.'}

Áreas de oportunidad:
${opportunityFindings.length ? opportunityFindings.slice(0,7).map(x=>'• '+x.title).join('\n') : '• La presencia digital ya cuenta con una base sólida; el siguiente paso sería escalar posicionamiento y conversión.'}`;
        const priority = opportunityFindings[0] || { title:'optimizar claridad y conversión' };
        const recommendation = `Recomendación DIGITEM-MX Salud:
Trabajar primero en ${mainOpportunity?.label || 'la claridad de la presencia digital'} permitirá construir una presencia más clara, confiable y orientada a contacto por WhatsApp. Prioriza: ${priority.title}.`;
        return { total, level, positives, opportunities, positiveFindings, opportunityFindings, priorities, scores, mainStrength, mainOpportunity, summary, recommendation, completedCriteria };
      }

      function buildRadarSvg(scores){
        const size = 420, cx = 210, cy = 210, maxR = 118;
        const pts = scores.map((s, i) => {
          const angle = (-90 + i * (360 / scores.length)) * Math.PI / 180;
          const r = maxR * ((s.value || 0) / 2);
          return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
        });
        const maxPts = scores.map((s, i) => {
          const angle = (-90 + i * (360 / scores.length)) * Math.PI / 180;
          const labelR = maxR + 48;
          return { x: cx + Math.cos(angle) * labelR, y: cy + Math.sin(angle) * labelR, label:s.short, value:s.value };
        });
        const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
        const rings = [0.5,1,1.5,2].map(v => {
          const r = maxR * (v/2);
          const ring = scores.map((s,i)=>{ const a=(-90+i*(360 / scores.length))*Math.PI/180; return `${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`; }).join(' ');
          return `<polygon points="${ring}" fill="none" stroke="rgba(15,31,46,.12)" stroke-width="1.2"/>`;
        }).join('');
        const axes = scores.map((s,i)=>{ const a=(-90+i*(360 / scores.length))*Math.PI/180; return `<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(a)*maxR}" y2="${cy+Math.sin(a)*maxR}" stroke="rgba(15,31,46,.10)" stroke-width="1"/>`; }).join('');
        const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#E07422" stroke="#fff" stroke-width="3"/>`).join('');
        const labels = maxPts.map((p,i) => {
          const anchor = p.x < cx - 8 ? 'end' : p.x > cx + 8 ? 'start' : 'middle';
          const dy = p.y < cy ? -4 : p.y > cy ? 13 : 4;
          return `<text x="${p.x}" y="${p.y+dy}" text-anchor="${anchor}" fill="#0F1F2E" font-size="14" font-weight="900">${scores[i].short}</text><text x="${p.x}" y="${p.y+dy+18}" text-anchor="${anchor}" fill="#E07422" font-size="13" font-weight="900">${scores[i].value}/2</text>`;
        }).join('');
        return `<svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="Radar de Perspectiva Digital"><defs><filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="13" flood-color="#11999E" flood-opacity=".16"/></filter></defs>${rings}${axes}<polygon points="${poly}" fill="rgba(17,153,158,.23)" stroke="#11999E" stroke-width="4" filter="url(#softShadow)"/>${dots}${labels}<circle cx="${cx}" cy="${cy}" r="5" fill="#11999E" stroke="#fff" stroke-width="2"/></svg>`;
      }

      function updateEvaluationPreview(){
        const formEl = document.getElementById('evaluationForm');
        if(!formEl) return;
        const data = new FormData(formEl);
        const result = getEvaluationResult(data);
        const summaryPreview = document.getElementById('summaryPreview');
        const analysisPreview = document.getElementById('analysisPreview');
        const radar = document.getElementById('radarPreview');
        result.scores.forEach(s => {
          const count = formEl.querySelector(`[data-criteria-count="${s.label === 'Visibilidad local' ? 'visibility_score' : s.label === 'Confianza' ? 'trust_score' : s.label === 'Claridad del servicio' ? 'clarity_score' : s.label === 'WhatsApp' ? 'whatsapp_score' : s.label === 'Presencia profesional' ? 'professional_presence_score' : 'digital_authority_score'}"]`);
          const score = formEl.querySelector(`[data-criteria-score="${s.label === 'Visibilidad local' ? 'visibility_score' : s.label === 'Confianza' ? 'trust_score' : s.label === 'Claridad del servicio' ? 'clarity_score' : s.label === 'WhatsApp' ? 'whatsapp_score' : s.label === 'Presencia profesional' ? 'professional_presence_score' : 'digital_authority_score'}"]`);
          if(count) count.textContent = `${s.checkedCount} de 3 criterios`;
          if(score) score.textContent = `Resultado: ${s.value}/2`;
        });
        const summaryField = formEl.querySelector('[name="summary"]');
        const recField = formEl.querySelector('[name="recommendation"]');
        if(summaryField && !summaryField.dataset.edited) summaryField.value = result.summary;
        if(recField && !recField.dataset.edited) recField.value = result.recommendation;
        if(radar) radar.innerHTML = buildRadarSvg(result.scores);
        const allSame = result.scores.every(s => s.value === result.scores[0]?.value);
        const strengthTitle = allSame && result.total < 8 ? 'Base inicial' : (result.mainStrength?.label || 'Base inicial');
        const strengthCopy = allSame && result.total < 8 ? 'Existe una base para comenzar a ordenar y mejorar la presencia digital.' : (result.mainStrength?.value >= 2 ? 'Este punto ya transmite una señal positiva para el prospecto.' : 'Hay una base inicial para trabajar.');
        const opportunityTitle = result.mainOpportunity?.label || 'Optimización digital';
        const opportunityCopy = result.mainOpportunity?.value >= 2 ? 'El siguiente paso es escalar este punto para convertirlo en ventaja competitiva.' : (result.mainOpportunity?.action || 'Conviene priorizar esta mejora para elevar claridad y conversión.');
        if(summaryPreview){
          summaryPreview.innerHTML = `<article class="summary-card score-card-main"><span>Puntaje general</span><strong>${result.total}/12</strong><em>${result.level}</em></article><article class="summary-card"><span>Fortaleza principal</span><strong>${escapeHtml(strengthTitle)}</strong><p>${escapeHtml(strengthCopy)}</p></article><article class="summary-card opportunity-card"><span>Oportunidad principal</span><strong>${escapeHtml(opportunityTitle)}</strong><p>${escapeHtml(opportunityCopy)}</p></article><article class="summary-card level-card"><span>Nivel actual</span><strong>${escapeHtml(result.level)}</strong><p>${result.total <= 6 ? 'Está construyendo una base digital más clara.' : 'Cuenta con una base lista para escalar.'}</p></article>`;
        }
        if(analysisPreview){
          const positiveItems = result.positives.length ? result.positives.slice(0,4) : ['Base inicial para comenzar a trabajar.'];
          const opportunityItems = result.opportunities.length ? result.opportunities.slice(0,4) : ['Escalar posicionamiento, confianza y conversión.'];
          analysisPreview.innerHTML = `<section class="analysis-panel strengths"><div class="analysis-title"><span>✓</span><h4>Fortalezas detectadas</h4></div>${positiveItems.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</section><section class="analysis-panel opportunities"><div class="analysis-title"><span>!</span><h4>Áreas de oportunidad</h4></div>${opportunityItems.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}</section>`;
        }
      }

      function evaluationTool(){ return `<form class="tool-card workflow-card evaluation-card" id="evaluationForm"><div class="tool-head compact-head"><div><p class="eyebrow">Paso 2 · Evaluación</p><h3>Perspectiva Digital Express</h3><p class="tool-intro">Marca los criterios internos. El score, radar, fortalezas y oportunidades se actualizan en tiempo real para formar el reporte.</p></div><button class="ghost-button" type="button" data-kb-open="evaluation">Ver criterios</button></div><div class="evaluation-v15-layout"><div class="score-grid survey-grid compact-survey-grid criteria-grid">${evaluationFields.map(criteriaCard).join('')}</div><aside class="report-preview-card"><div class="report-preview-head"><p class="eyebrow">Vista previa V1.7.4</p><h4>Radar del reporte</h4></div><div id="summaryPreview" class="report-summary-strip"></div><div id="radarPreview" class="radar-preview"></div><div id="analysisPreview" class="report-analysis-grid"></div></aside></div><div class="evaluation-action-panel"><div><strong>Evaluación completada</strong><span>Guarda los criterios antes de generar el PDF o avanzar a recomendación.</span></div><div class="evaluation-action-buttons"><button class="primary" type="submit" id="saveEvaluationButton">Guardar evaluación</button><button type="button" class="ghost-button pdf-action" id="generatePdfButton">Generar PDF</button><button type="button" class="ghost-button" data-status-to="recomendacion">Continuar a recomendación</button></div></div><p id="evalMessage" class="form-message"></p></form>`; }

      function hydrateEvaluationForm(saved){
        const formEl = document.getElementById('evaluationForm');
        if(!formEl || !saved) return;
        formEl.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
        const payload = saved.criteria_data || {};
        const savedScores = Array.isArray(payload.scores) ? payload.scores : [];
        savedScores.forEach(item => {
          const field = evaluationFields.find(f => f.name === item.name);
          if(!field) return;
          (item.checkedKeys || []).forEach(key => {
            const input = formEl.querySelector(`input[name="${field.name}_criteria"][value="${key}"]`);
            if(input) input.checked = true;
          });
        });
        const summary = formEl.querySelector('[name="summary"]');
        const recommendation = formEl.querySelector('[name="recommendation"]');
        if(summary && saved.summary){ summary.value = saved.summary; summary.dataset.edited = 'true'; }
        if(recommendation && saved.recommendation){ recommendation.value = saved.recommendation; recommendation.dataset.edited = 'true'; }
        const msg = document.getElementById('evalMessage');
        if(msg) msg.textContent = 'Evaluación cargada desde base de datos. Puedes modificar criterios y guardar cambios.';
      }

      function generateDigitalReportPdf(){
        const formEl = document.getElementById('evaluationForm');
        if(!formEl) return;
        const result = getEvaluationResult(new FormData(formEl));
        const jsPDFLib = window.jspdf?.jsPDF;
        if(!jsPDFLib){ alert('No se pudo cargar el generador PDF. Revisa tu conexión a internet.'); return; }
        const pdf = new jsPDFLib({ orientation:'portrait', unit:'pt', format:'a4' });
        const W = pdf.internal.pageSize.getWidth();
        const H = pdf.internal.pageSize.getHeight();
        const teal = [17,153,158], orange = [224,116,34], ink = [15,31,46], muted = [102,117,133], soft = [245,250,250];
        const prospect = state.selected || {};
        const safe = (v, fallback='—') => (v && String(v).trim()) ? String(v).trim() : fallback;
        function header(page){
          pdf.setFillColor(teal[0],teal[1],teal[2]); pdf.roundedRect(W-78,0,78,58,0,0,'F');
          pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(13); pdf.text(String(page) + '/3', W-48, 34, {align:'center'});
          pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.setFontSize(18); pdf.text('DIGITEM-MX', 46, 48); pdf.setTextColor(orange[0],orange[1],orange[2]); pdf.setFontSize(11); pdf.text('SALUD', 47, 64);
          pdf.setTextColor(muted[0],muted[1],muted[2]); pdf.setFontSize(8); pdf.text('Perspectiva Digital Express', (W - 190), 46);
        }
        function footer(){ pdf.setFillColor(3,83,92); pdf.roundedRect(40,H-88,W-80,52,14,14,'F'); pdf.setTextColor(255,255,255); pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.text('DIGITEM-MX Salud', 62, H-58); pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.text('Construimos presencia digital que genera confianza y resultados.', 62, H-43); pdf.text('www.digitem-mx.com', W-170, H-48); }
        function radar(cx,cy,r){
          const scores = result.scores;
          pdf.setDrawColor(220,230,232); pdf.setLineWidth(.8);
          [0.25,0.5,0.75,1].forEach(scale=>{ const pts=scores.map((s,i)=>{const a=(-90+i*(360/scores.length))*Math.PI/180; return [cx+Math.cos(a)*r*scale, cy+Math.sin(a)*r*scale];}); pdf.lines(pts.map((p,i)=> i===0 ? [0,0] : [p[0]-pts[i-1][0],p[1]-pts[i-1][1]]), pts[0][0], pts[0][1]); pdf.line(pts[pts.length-1][0],pts[pts.length-1][1],pts[0][0],pts[0][1]); });
          scores.forEach((s,i)=>{const a=(-90+i*(360/scores.length))*Math.PI/180; pdf.line(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r);});
          const pts=scores.map((s,i)=>{const a=(-90+i*(360/scores.length))*Math.PI/180; const rr=r*((s.value||0)/2); return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr];});
          pdf.setFillColor(17,153,158); pdf.setDrawColor(teal[0],teal[1],teal[2]); pdf.setGState(new pdf.GState({opacity:0.18})); pdf.triangle(0,0,0,0,0,0,'F'); pdf.setGState(new pdf.GState({opacity:1}));
          pdf.setFillColor(220,244,244); pdf.setDrawColor(teal[0],teal[1],teal[2]); pdf.setLineWidth(2);
          pdf.lines(pts.map((p,i)=> i===0 ? [0,0] : [p[0]-pts[i-1][0],p[1]-pts[i-1][1]]), pts[0][0], pts[0][1], [1,1], 'FD'); pdf.line(pts[pts.length-1][0],pts[pts.length-1][1],pts[0][0],pts[0][1]);
          pts.forEach(p=>{ pdf.setFillColor(orange[0],orange[1],orange[2]); pdf.circle(p[0],p[1],4,'F'); });
          scores.forEach((s,i)=>{const a=(-90+i*(360/scores.length))*Math.PI/180; const lx=cx+Math.cos(a)*(r+42), ly=cy+Math.sin(a)*(r+32); pdf.setTextColor(ink[0],ink[1],ink[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.text(s.short,lx,ly,{align:'center'}); pdf.setTextColor(orange[0],orange[1],orange[2]); pdf.text(`${s.value}/2`,lx,ly+12,{align:'center'});});
        }
        // Page 1
        header('1');
        pdf.setTextColor(ink[0],ink[1],ink[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(31); pdf.text('Perspectiva',46,126); pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.text('Digital Express',46,160); pdf.setDrawColor(orange[0],orange[1],orange[2]); pdf.setLineWidth(3); pdf.line(46,174,90,174);
        pdf.setTextColor(ink[0],ink[1],ink[2]); pdf.setFontSize(12); pdf.text(safe(prospect.name,'Lic. Fernanda De Alba'),46,224); pdf.setFont('helvetica','normal'); pdf.setTextColor(muted[0],muted[1],muted[2]); pdf.text(safe(prospect.business_name,'Psicología'),46,243); pdf.text(new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'}),46,267);
        pdf.setFillColor(soft[0],soft[1],soft[2]); pdf.roundedRect(46,314,140,100,12,12,'F'); pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.text('PUNTAJE GENERAL',62,340); pdf.setFontSize(38); pdf.text(String(result.total),62,384); pdf.setFontSize(16); pdf.setTextColor(ink[0],ink[1],ink[2]); pdf.text('/ 12',112,384); pdf.setTextColor(orange[0],orange[1],orange[2]); pdf.setFontSize(11); pdf.text(result.level,62,402);
        // Radar centrado sin bloque superpuesto. El insight se conserva como línea discreta debajo del puntaje.
        radar(370,350,118);
        pdf.setTextColor(muted[0],muted[1],muted[2]); pdf.setFont('helvetica','normal'); pdf.setFontSize(8.5);
        pdf.text(pdf.splitTextToSize(`Fortaleza principal: ${safe(result.mainStrength?.label)} · Oportunidad principal: ${safe(result.mainOpportunity?.label)}`, 150), 46, 436, {lineHeightFactor:1.12});
        footer();
        // Page 2
        pdf.addPage(); header('2');
        pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(22); pdf.text('Fortalezas detectadas',46,110);
        pdf.setTextColor(orange[0],orange[1],orange[2]); pdf.text('Áreas de oportunidad',310,110);
        const strengths = result.positiveFindings.length ? result.positiveFindings.slice(0,5) : [{icon:'✓', title:'Base inicial para trabajar', description:'Existe una base inicial para ordenar la presencia digital.'}];
        const gaps = result.opportunityFindings.length ? result.opportunityFindings.slice(0,5) : [{icon:'•', title:'Escalar posicionamiento y conversión', description:'La presencia digital ya cuenta con bases para escalar.'}];
        function findingCard(item, x, y, tone){
          const isTeal = tone === 'teal';
          pdf.setFillColor(isTeal ? 238 : 255, isTeal ? 248 : 246, isTeal ? 248 : 241);
          pdf.roundedRect(x,y,224,44,12,12,'F');
          pdf.setFillColor(isTeal ? teal[0] : orange[0], isTeal ? teal[1] : orange[1], isTeal ? teal[2] : orange[2]);
          pdf.circle(x+18,y+22,9,'F');
          pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.text(isTeal?'✓':'!',x+18,y+25,{align:'center'});
          pdf.setTextColor(ink[0],ink[1],ink[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(9.3);
          pdf.text(pdf.splitTextToSize(item.title || item.description || 'Hallazgo', 170).slice(0,2), x+36, y+18, {lineHeightFactor:1.1});
        }
        let fy=142; strengths.forEach((item)=>{ findingCard(item,46,fy,'teal'); fy+=54; });
        fy=142; gaps.forEach((item)=>{ findingCard(item,310,fy,'orange'); fy+=54; });

        let ay = 462;
        pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(15); pdf.text('Análisis general',46,ay);
        ay += 24;
        pdf.setTextColor(ink[0],ink[1],ink[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(10);
        pdf.text(`Puntaje: ${result.total}/12 · ${result.level}`,46,ay);
        pdf.text(`Cumplimiento: ${result.completedCriteria}/18 criterios`,310,ay);
        ay += 28;
        pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Aspectos positivos',46,ay);
        ay += 16;
        pdf.setTextColor(muted[0],muted[1],muted[2]); pdf.setFont('helvetica','normal'); pdf.setFontSize(8.6);
        const positivesText = strengths.map(x => `- ${x.title}`).join('\n');
        pdf.text(pdf.splitTextToSize(positivesText, W-92).slice(0,7),46,ay,{lineHeightFactor:1.18});
        ay += Math.min(82, 14 + strengths.length*18);
        pdf.setTextColor(orange[0],orange[1],orange[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(11); pdf.text('Áreas de oportunidad',46,ay);
        ay += 16;
        pdf.setTextColor(muted[0],muted[1],muted[2]); pdf.setFont('helvetica','normal'); pdf.setFontSize(8.6);
        const gapsText = gaps.map(x => `- ${x.title}`).join('\n');
        pdf.text(pdf.splitTextToSize(gapsText, W-92).slice(0,9),46,ay,{lineHeightFactor:1.18});
        footer();
        // Page 3
        pdf.addPage(); header('3');
        pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(22); pdf.text('Plan de acción recomendado',46,110);
        const pr = result.opportunityFindings.length ? result.opportunityFindings.slice(0,3).map((f)=>({label:f.category || 'Oportunidad', action:f.title || f.description, value:0})) : (result.priorities.length ? result.priorities : result.scores.slice(0,3).map(s=>({label:s.label, action:s.action, value:s.value})));
        y=160; pr.slice(0,3).forEach((p,i)=>{const high=i===0; pdf.setFillColor(high?238:255, high?248:245, high?248:238); pdf.roundedRect(86,y-34,W-150,76,14,14,'F'); pdf.setFillColor(i===0?teal[0]:orange[0],i===0?teal[1]:orange[1],i===0?teal[2]:orange[2]); pdf.circle(58,y,16,'F'); pdf.setTextColor(255,255,255); pdf.setFontSize(13); pdf.text(String(i+1),58,y+5,{align:'center'}); pdf.setTextColor(i===0?teal[0]:orange[0],i===0?teal[1]:orange[1],i===0?teal[2]:orange[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.text(i===0?'Prioridad alta':i===1?'Prioridad media':'Prioridad baja',110,y-8); pdf.setTextColor(ink[0],ink[1],ink[2]); pdf.setFontSize(13); pdf.text(p.label,110,y+10); pdf.setTextColor(muted[0],muted[1],muted[2]); pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.text(pdf.splitTextToSize(p.action,W-185),110,y+28); y+=105;});
        pdf.setFillColor(soft[0],soft[1],soft[2]); pdf.roundedRect(46,520,W-92,96,16,16,'F'); pdf.setTextColor(teal[0],teal[1],teal[2]); pdf.setFont('helvetica','bold'); pdf.setFontSize(15); pdf.text('Siguiente paso sugerido',70,552); pdf.setTextColor(muted[0],muted[1],muted[2]); pdf.setFont('helvetica','normal'); pdf.setFontSize(10); pdf.text(pdf.splitTextToSize('Agendemos una sesión estratégica sin compromiso para revisar cómo convertir estas oportunidades en una presencia digital más clara, confiable y orientada a pacientes.', W-140),70,576); pdf.setTextColor(orange[0],orange[1],orange[2]); pdf.setFont('helvetica','bold'); pdf.text('Hablemos de cómo podemos ayudarte.',70,606);
        footer();
        pdf.save(`Perspectiva_Digital_Express_${safe(prospect.name,'prospecto').replaceAll(' ','_')}.pdf`);
      }

      function recommendationTool(){ const msg = `Te comparto una perspectiva breve sobre tu presencia digital.

Lo positivo: tu trabajo comunica una especialidad clara y tiene potencial para conectar con pacientes que buscan apoyo profesional.

Oportunidad principal: podríamos mejorar la claridad del recorrido para que una persona entienda tus servicios, confíe y sepa cómo contactarte desde WhatsApp sin fricción.

Recomendación: una landing SEO enfocada en tu especialidad y zona puede ayudarte a ordenar tu presencia digital y facilitar el primer contacto.`; return `<div class="tool-card workflow-card"><div class="tool-head"><div><p class="eyebrow">Paso 3 · Recomendación</p><h3>Resumen para enviar</h3></div><button class="ghost-button" type="button" data-kb-open="guide">Ver estructura</button></div><textarea readonly rows="9">${msg}</textarea><div class="action-buttons"><button data-copy="${encodeURIComponent(msg)}" type="button">Copiar recomendación</button><button type="button" data-status-to="seguimiento">Programar seguimiento</button><button type="button" data-status-to="cliente">Marcar como cliente</button></div></div>`; }
      function objectionsTool(){
        const texts = [
          {
            t:'No me interesa',
            m:`Muchas gracias por tomarte el tiempo de leer la información 🙌

Entiendo perfectamente. Mi intención era únicamente compartir una perspectiva externa que pudiera resultar útil para tu proyecto.

Te deseo mucho éxito y, si en algún momento necesitas una segunda opinión sobre tu presencia digital o algún tema relacionado con tecnología y crecimiento de tu práctica, con gusto estaré disponible.`
          },
          {
            t:'Ya tengo página web',
            m:`Excelente, eso ya representa una base importante 👏

Normalmente el enfoque no está en reemplazar lo que tienes, sino en identificar oportunidades para mejorar visibilidad, claridad o conversión dependiendo de tus objetivos actuales.

Gracias por tu tiempo y por permitirme conocer un poco más de tu proyecto.`
          },
          {
            t:'No tengo presupuesto',
            m:`Lo entiendo perfectamente. Muchas veces el momento adecuado para invertir depende de las prioridades de cada etapa.

Mi intención principal era compartir información útil, independientemente de que exista o no una colaboración inmediata.

Cuando consideres que es buen momento para explorar opciones, con gusto podemos retomar la conversación.`
          }
        ];
        return `<div class="tool-card workflow-card"><div class="tool-head"><div><p class="eyebrow">Objeciones</p><h3>Respuestas suaves</h3></div><button class="ghost-button" type="button" data-kb-open="objections">¿Cuándo usar?</button></div><div class="stack">${texts.map(o => `<article class="mini-template"><h4>${o.t}</h4><p>${o.m.replaceAll('\n','<br/>')}</p><button class="copy-button" data-copy="${encodeURIComponent(o.m)}" type="button">Copiar respuesta</button></article>`).join('')}</div><div class="action-buttons"><button type="button" data-status-to="seguimiento">Dejar en seguimiento</button><button type="button" data-status-to="descartado">Descartar con historial</button></div></div>`;
      }
      function getProspectFirstName(){
        const name = state.selected?.name || 'hola';
        return String(name).trim().split(/\s+/)[0] || 'hola';
      }

      function followupTemplateText(type='retomar', channel='whatsapp'){
        const name = getProspectFirstName();
        const prefix = channel === 'correo' ? `Hola ${name},` : `Hola ${name}, buena tarde 👋`;
        const templates = {
          retomar: `${prefix}\n\nSolo quería retomar la Perspectiva Digital Express que revisamos sobre tu presencia digital.\n\n¿Tuviste oportunidad de verla? Si tienes alguna duda, con gusto puedo ayudarte a aterrizar los siguientes pasos.`,
          no_respondio: `${prefix}\n\nTe escribo para dar seguimiento al mensaje que te compartí hace unos días.\n\nLa intención es únicamente revisar si la perspectiva digital puede ayudarte a identificar oportunidades para mejorar visibilidad, confianza y contacto con nuevos pacientes.\n\nSi ahora no es buen momento, lo entiendo perfectamente.`,
          interesado: `${prefix}\n\nGracias por el interés mostrado. Con base en la evaluación, veo oportunidades concretas para fortalecer tu presencia digital y facilitar que más pacientes te contacten con claridad.\n\n¿Te parece si agendamos una llamada breve de 15 minutos esta semana para revisar los siguientes pasos?`,
          pdf: `${prefix}\n\n¿Pudiste revisar el reporte que te compartí?\n\nMe gustaría conocer tu opinión y resolver cualquier duda antes de definir si tiene sentido avanzar con una propuesta más concreta para tu consultorio.`,
          cotizacion: `${prefix}\n\nComo seguimiento a lo que platicamos, puedo prepararte una propuesta sencilla con alcance, tiempos y recomendación inicial para mejorar tu presencia digital.\n\n¿Te gustaría que la arme con base en el diagnóstico?`,
          cierre: `${prefix}\n\nSolo quería cerrar el seguimiento de esta conversación. Si más adelante te interesa revisar tu presencia digital o necesitas una segunda opinión, con gusto estaré disponible.\n\nTe deseo mucho éxito con tu proyecto.`
        };
        return templates[type] || templates.retomar;
      }

      function hydrateSuggestedFollowupMessage(){
        const form = document.querySelector('#followupForm');
        if(!form) return;
        const scenario = form.querySelector('#followupScenario')?.value || 'retomar';
        const channel = form.querySelector('#followupChannel')?.value || 'whatsapp';
        const textarea = form.querySelector('textarea[name="message"]');
        if(textarea) textarea.value = followupTemplateText(scenario, channel);
        const title = form.querySelector('input[name="title"]');
        const titles = { retomar:'Retomar conversación', no_respondio:'Seguimiento por falta de respuesta', interesado:'Agendar llamada breve', pdf:'Seguimiento posterior al PDF', cotizacion:'Preparar cotización', cierre:'Cierre cordial' };
        if(title && (!title.value || title.dataset.auto === 'true')){ title.value = titles[scenario] || 'Retomar conversación'; title.dataset.auto = 'true'; }
      }

      function followupObjectiveLabel(type){
        return ({
          retomar:'Retomar conversación sin presión.',
          no_respondio:'Reactivar un contacto que no respondió.',
          interesado:'Convertir interés en llamada breve.',
          pdf:'Resolver dudas después de enviar el reporte.',
          cotizacion:'Abrir conversación para propuesta comercial.',
          cierre:'Cerrar cordialmente sin perder relación.'
        })[type] || 'Dar seguimiento a la oportunidad.';
      }

      function followupTool(){
        const list = state.followups[state.selected?.id] || [];
        const pending = list.filter(f => f.status === 'pendiente' && !f.completed);
        const done = list.filter(f => f.status !== 'pendiente' || f.completed);
        const suggested = followupTemplateText('retomar','whatsapp');
        const listHtml = list.length ? list.map(f => followupItem(f)).join('') : `<div class="empty-list soft">Aún no hay seguimientos. Agenda el primero para no perder esta oportunidad.</div>`;
        return `<div class="tool-card workflow-card followup-workflow">
          <div class="tool-head"><div><p class="eyebrow">Paso 5 · Seguimiento</p><h3>Secuencia de seguimiento</h3><p class="tool-intro">Cada seguimiento debe tener un objetivo claro y un mensaje sugerido editable. El botón copiar toma exactamente ese mensaje.</p></div><button class="ghost-button" type="button" data-kb-open="followup">Buenas prácticas</button></div>
          <div class="followup-summary-row">
            <article><span>Pendientes</span><strong>${pending.length}</strong></article>
            <article><span>Realizados</span><strong>${done.filter(f => f.status === 'realizado' || f.completed).length}</strong></article>
            <article><span>Total</span><strong>${list.length}</strong></article>
          </div>
          <div class="followup-grid">
            <form class="followup-form-card" id="followupForm">
              <p class="eyebrow">Nuevo seguimiento</p>
              <label><span>Objetivo del seguimiento</span><select id="followupScenario" name="scenario">
                <option value="retomar">Retomar conversación</option>
                <option value="no_respondio">No respondió</option>
                <option value="interesado">Mostró interés</option>
                <option value="pdf">Después de enviar PDF</option>
                <option value="cotizacion">Abrir cotización</option>
                <option value="cierre">Cierre cordial</option>
              </select></label>
              <label><span>Título interno</span><input name="title" data-auto="true" required value="Retomar conversación" /></label>
              <div class="form-grid-mini">
                <label><span>Canal</span><select id="followupChannel" name="channel"><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="llamada">Llamada</option><option value="correo">Correo</option></select></label>
                <label><span>Fecha</span><input name="due_date" type="date" /></label>
                <label><span>Hora</span><input name="due_time" type="time" /></label>
              </div>
              <div class="template-chips" aria-label="Plantillas rápidas">
                <button type="button" data-followup-template="retomar">Retomar</button>
                <button type="button" data-followup-template="no_respondio">No respondió</button>
                <button type="button" data-followup-template="interesado">Interesado</button>
                <button type="button" data-followup-template="pdf">Post PDF</button>
              </div>
              <label><span>Mensaje sugerido editable</span><textarea name="message" rows="7">${suggested}</textarea></label>
              <label><span>Notas internas</span><textarea name="notes" rows="3" placeholder="Contexto, acuerdos, temperatura del lead..."></textarea></label>
              <div class="action-buttons"><button class="primary" type="submit">Guardar seguimiento</button><button class="ghost-button" type="button" data-clear-followup>Limpiar</button></div>
              <p id="followupMessage" class="form-message"></p>
            </form>
            <section class="followup-list-card">
              <div class="section-head compact"><div><p class="eyebrow">Historial y próximos pasos</p><h4>Seguimientos registrados</h4></div></div>
              <div class="followups-list">${listHtml}</div>
            </section>
          </div>
        </div>`;
      }

      function followupItem(f){
        const channelLabel = ({whatsapp:'WhatsApp', instagram:'Instagram', llamada:'Llamada', correo:'Correo'})[f.channel] || (f.channel || 'Seguimiento');
        const statusLabel = ({pendiente:'Pendiente', realizado:'Realizado', cancelado:'Cancelado'})[f.status] || f.status || 'Pendiente';
        const dateText = [f.due_date || 'Sin fecha', f.due_time ? f.due_time.slice(0,5) : ''].filter(Boolean).join(' · ');
        const safeMessage = f.message || followupTemplateText('retomar', f.channel || 'whatsapp');
        const encodedMsg = encodeURIComponent(safeMessage);
        const resultOptions = `
          <button type="button" data-followup-id="${f.id}" data-followup-action="realizado" data-followup-result="respondio" class="followup-result-btn is-positive">Respondió</button>
          <button type="button" data-followup-id="${f.id}" data-followup-action="realizado" data-followup-result="no_respondio" class="followup-result-btn">No respondió</button>
          <button type="button" data-followup-id="${f.id}" data-followup-action="realizado" data-followup-result="interesado" class="followup-result-btn is-positive">Interesado</button>
          <button type="button" data-followup-id="${f.id}" data-followup-action="cancelado" class="followup-danger">Cancelar</button>`;
        const isPending = f.status === 'pendiente' && !f.completed;
        const detailId = `followup-detail-${f.id}`;
        const viewButton = !isPending ? `<button class="followup-view" type="button" data-followup-toggle="${f.id}" aria-controls="${detailId}" aria-expanded="false">👁️ Ver contexto</button>` : '';
        return `<article class="followup-item ${isPending ? 'pending is-open' : 'closed'}">
          <div class="followup-item-head"><div><strong>${escapeHtml(f.title || 'Seguimiento')}</strong><span>${escapeHtml(channelLabel)} · ${escapeHtml(dateText)}</span></div><div class="followup-head-actions"><small>${escapeHtml(statusLabel)}</small>${viewButton}</div></div>
          <div class="followup-details" id="${detailId}">
            <div class="followup-objective"><span>Objetivo</span><p>${escapeHtml(f.title || 'Dar seguimiento a la oportunidad.')}</p></div>
            <div class="followup-message-block"><span>Mensaje sugerido</span><p class="followup-message">${escapeHtml(safeMessage)}</p></div>
            ${f.notes ? `<p class="followup-notes"><strong>Notas internas:</strong> ${escapeHtml(f.notes)}</p>` : ''}
            ${f.result ? `<p class="followup-result">Resultado: ${escapeHtml(resultLabel(f.result))}</p>` : ''}
          </div>
          <div class="followup-actions"><button class="followup-copy" type="button" data-copy="${encodedMsg}">📋 Copiar mensaje</button>${isPending ? resultOptions : ''}<button class="followup-delete" type="button" data-followup-delete="${f.id}">Eliminar</button></div>
        </article>`;
      }

      function resultLabel(result){ return ({respondio:'Respondió', no_respondio:'No respondió', interesado:'Interesado', lo_va_a_pensar:'Lo va a pensar', descartado:'Descartado', convertido_cliente:'Convertido a cliente'})[result] || result || 'Sin resultado'; }

      function clientTool(){
        return `<div class="tool-card workflow-card client-flow"><div class="tool-head"><div><p class="eyebrow">Cliente activo</p><h3>Nuevo flujo de entrega</h3></div></div><p class="tool-intro">El prospecto ya no debe volver al flujo comercial. A partir de aquí comienza la operación del proyecto.</p><div class="client-steps"><article><span>01</span><h4>Onboarding</h4><p>Confirmar objetivos, recopilar información y definir alcance.</p></article><article><span>02</span><h4>Cotización</h4><p>Preparar propuesta, paquete recomendado y condiciones.</p></article><article><span>03</span><h4>Producción</h4><p>Diseño, copy, SEO, implementación y revisión interna.</p></article><article><span>04</span><h4>Entrega</h4><p>QA, publicación, capacitación breve y cierre del proyecto.</p></article></div><div class="action-buttons"><button type="button" data-kb-open="client">Ver checklist de cliente</button><button type="button" data-status-to="seguimiento">Programar seguimiento de entrega</button></div></div>`;
      }

      async function updateStatus(id,status){
        const { error } = await supabase.from('prospects').update({ status }).eq('id', id);
        if(error) return alert(error.message);
        await addActivity(id,'status',`Estado actualizado a ${statusLabels[status] || status}`);
        await loadProspects();
        state.selected = state.prospects.find(p => p.id === id);
        renderSelected();
      }
      async function addActivity(prospect_id,type,description){ await supabase.from('activities').insert({ prospect_id, type, description, owner_id: state.session.user.id }); }
      async function saveEvaluation(e){
        e.preventDefault();
        if(!state.selected?.id){ showToast('Selecciona un prospecto antes de guardar.', 'error'); return; }
        const form = new FormData(e.target);
        const result = getEvaluationResult(form);
        const payload = {
          prospect_id: state.selected.id,
          owner_id: state.session.user.id,
          visibility_score: result.scores.find(s => s.name === 'visibility_score')?.value ?? 0,
          trust_score: result.scores.find(s => s.name === 'trust_score')?.value ?? 0,
          clarity_score: result.scores.find(s => s.name === 'clarity_score')?.value ?? 0,
          whatsapp_score: result.scores.find(s => s.name === 'whatsapp_score')?.value ?? 0,
          professional_presence_score: result.scores.find(s => s.name === 'professional_presence_score')?.value ?? 0,
          digital_authority_score: result.scores.find(s => s.name === 'digital_authority_score')?.value ?? 0,
          completed_criteria: result.completedCriteria,
          level: result.level,
          summary: result.summary,
          recommendation: result.recommendation,
          criteria_data: {
            version: '1.7.4',
            total_score: result.total,
            max_score: 12,
            completed_criteria: result.completedCriteria,
            max_criteria: 18,
            level: result.level,
            scores: result.scores.map(s => ({
              name: s.name,
              label: s.label,
              short: s.short,
              value: s.value,
              checkedCount: s.checkedCount,
              checkedKeys: s.checkedKeys,
              completed: s.completed,
              missing: s.missing
            }))
          }
        };
        const existing = state.evaluations[state.selected.id];
        const query = existing?.id
          ? supabase.from('evaluations').update(payload).eq('id', existing.id).select().single()
          : supabase.from('evaluations').insert(payload).select().single();
        const { data, error } = await query;
        if(error){
          const rawMsg = error.message || 'No se pudo guardar la evaluación.';
          const schemaHint = /column|schema|criteria_data|digital_authority_score|completed_criteria|level/i.test(rawMsg)
            ? 'Falta ejecutar el SQL de V1.7.3 en Supabase para actualizar la tabla evaluations.'
            : rawMsg;
          const msg = schemaHint;
          el('evalMessage').textContent = msg;
          showToast(msg, 'error');
          console.error('Supabase saveEvaluation error:', error);
          return;
        }
        state.evaluations[state.selected.id] = data;
        await addActivity(state.selected.id,'evaluation','Evaluación guardada');
        el('evalMessage').textContent = 'Cambios guardados. Ya puedes generar el PDF o continuar a recomendación.';
        showToast('Cambios guardados');
      }
      async function saveFollowup(e){
        e.preventDefault();
        if(!state.selected?.id){ showToast('Selecciona un prospecto antes de guardar.', 'error'); return; }
        const form = new FormData(e.target);
        const scenario = form.get('scenario') || 'retomar';
        const channel = form.get('channel') || 'whatsapp';
        const payload = {
          prospect_id: state.selected.id,
          owner_id: state.session.user.id,
          title: form.get('title') || followupObjectiveLabel(scenario),
          channel,
          due_date: form.get('due_date') || null,
          due_time: form.get('due_time') || null,
          message: form.get('message') || followupTemplateText(scenario, channel),
          notes: form.get('notes') || null,
          status: 'pendiente',
          completed: false
        };
        const { error } = await supabase.from('followups').insert(payload);
        if(error){
          const msg = /channel|due_time|message|status|result|updated_at/i.test(error.message || '') ? 'Falta ejecutar el SQL de V1.8 en Supabase para actualizar followups.' : error.message;
          el('followupMessage').textContent = msg;
          showToast(msg, 'error');
          console.error('Supabase saveFollowup error:', error);
          return;
        }
        await addActivity(state.selected.id,'followup','Seguimiento creado');
        await loadFollowups(state.selected.id);
        showToast('Seguimiento guardado');
        renderTool('followup');
      }

      async function updateFollowup(id, status, result=null){
        const payload = { status, completed: status === 'realizado', result };
        const { error } = await supabase.from('followups').update(payload).eq('id', id);
        if(error){ showToast(error.message || 'No se pudo actualizar el seguimiento.', 'error'); return; }
        await addActivity(state.selected.id,'followup',`Seguimiento actualizado: ${status}${result ? ' · ' + resultLabel(result) : ''}`);
        await loadFollowups(state.selected.id);
        showToast('Seguimiento actualizado');
        renderTool('followup');
      }


      const deleteState = { type:null, id:null, name:null, phrase:null };
      function normalizeConfirmText(value){ return (value || '').trim().replace(/ /g,' '); }
      function setupDeleteDialog(){
        const dialog = el('deleteDialog');
        const phraseInput = el('deletePhraseInput');
        const nameInput = el('deleteNameInput');
        const validate = () => {
          const phraseOk = !deleteState.phrase || normalizeConfirmText(phraseInput.value) === deleteState.phrase;
          const nameOk = !deleteState.name || normalizeConfirmText(nameInput.value) === deleteState.name;
          el('confirmDeleteButton').disabled = !(phraseOk && nameOk);
        };
        phraseInput?.addEventListener('input', validate);
        nameInput?.addEventListener('input', validate);
        el('closeDeleteDialog')?.addEventListener('click', closeDeleteDialog);
        el('cancelDeleteDialog')?.addEventListener('click', closeDeleteDialog);
        el('deleteForm')?.addEventListener('submit', confirmDelete);
        dialog?.addEventListener('cancel', () => { deleteState.type=null; });
      }
      function resetDeleteDialog(){
        el('deleteMessage').textContent = '';
        el('deletePhraseInput').value = '';
        el('deleteNameInput').value = '';
        el('confirmDeleteButton').disabled = true;
        el('deletePhraseWrap').style.display = '';
        el('deleteNameWrap').style.display = '';
      }
      function openDeleteProspectDialog(prospect){
        if(!prospect?.id) return;
        deleteState.type = 'prospect'; deleteState.id = prospect.id; deleteState.name = prospect.name; deleteState.phrase = 'Eliminar prospecto';
        resetDeleteDialog();
        el('deleteTitle').textContent = 'Eliminar prospecto';
        el('deleteWarning').innerHTML = `Vas a eliminar <strong>${escapeHtml(prospect.name)}</strong> y toda su información asociada: evaluación, actividades y seguimientos. Esta acción no se puede deshacer.`;
        el('deletePhraseLabel').textContent = 'Primera confirmación: escribe exactamente “Eliminar prospecto”';
        el('deletePhraseInput').placeholder = 'Eliminar prospecto';
        el('deleteNameLabel').textContent = `Segunda confirmación: escribe exactamente “${prospect.name}”`;
        el('deleteNameInput').placeholder = prospect.name;
        el('confirmDeleteButton').textContent = 'Eliminar prospecto definitivamente';
        el('deleteDialog').showModal();
      }
      function openDeleteFollowupDialog(followup){
        if(!followup?.id) return;
        deleteState.type = 'followup'; deleteState.id = followup.id; deleteState.name = followup.title || 'Seguimiento'; deleteState.phrase = null;
        resetDeleteDialog();
        el('deleteTitle').textContent = 'Eliminar seguimiento';
        el('deleteWarning').innerHTML = `Vas a eliminar el seguimiento <strong>${escapeHtml(deleteState.name)}</strong>. Esta acción solo borra este registro, no elimina al prospecto.`;
        el('deletePhraseWrap').style.display = 'none';
        el('deleteNameLabel').textContent = `Confirmación: escribe exactamente “${deleteState.name}”`;
        el('deleteNameInput').placeholder = deleteState.name;
        el('confirmDeleteButton').textContent = 'Eliminar seguimiento';
        el('deleteDialog').showModal();
      }
      function closeDeleteDialog(){ el('deleteDialog')?.close(); deleteState.type=null; deleteState.id=null; deleteState.name=null; deleteState.phrase=null; }
      async function confirmDelete(e){
        e.preventDefault();
        if(!deleteState.type || !deleteState.id) return;
        el('confirmDeleteButton').disabled = true;
        if(deleteState.type === 'followup'){
          const { error } = await supabase.from('followups').delete().eq('id', deleteState.id);
          if(error){ el('deleteMessage').textContent = error.message || 'No se pudo eliminar el seguimiento.'; showToast(el('deleteMessage').textContent,'error'); el('confirmDeleteButton').disabled = false; return; }
          if(state.selected?.id){ await addActivity(state.selected.id,'followup','Seguimiento eliminado'); await loadFollowups(state.selected.id); }
          closeDeleteDialog(); showToast('Seguimiento eliminado'); renderTool('followup'); return;
        }
        if(deleteState.type === 'prospect'){
          const deletedId = deleteState.id;
          const { error } = await supabase.from('prospects').delete().eq('id', deletedId);
          if(error){ el('deleteMessage').textContent = error.message || 'No se pudo eliminar el prospecto.'; showToast(el('deleteMessage').textContent,'error'); el('confirmDeleteButton').disabled = false; return; }
          closeDeleteDialog();
          if(state.selected?.id === deletedId) state.selected = null;
          await loadProspects();
          setView('prospects');
          showToast('Prospecto eliminado');
        }
      }

      function openProspectDialog(){ el('prospectDialog').showModal(); }
      function closeProspectDialog(){ el('prospectDialog').close(); }
      async function createProspect(e){
        e.preventDefault();
        const payload = { owner_id: state.session.user.id, name: el('pName').value.trim(), business_name: el('pBusiness').value.trim(), business_line: el('pLine').value, whatsapp: el('pWhatsapp').value.trim(), email: el('pEmail').value.trim(), instagram: el('pInstagram').value.trim(), website: el('pWebsite').value.trim(), city: el('pCity').value.trim(), source: el('pSource').value.trim(), notes: el('pNotes').value.trim(), status:'prospeccion' };
        const { data, error } = await supabase.from('prospects').insert(payload).select().single();
        if(error){ el('prospectMessage').textContent = error.message; return; }
        await addActivity(data.id,'created','Prospecto creado');
        e.target.reset(); closeProspectDialog(); state.line = data.business_line; state.selected = data; setView('prospects'); await loadProspects();
      }

      function openKb(type){ const data = kbData[type]; el('kbTitle').textContent = data.title; el('kbContent').innerHTML = data.html; el('kbDialog').showModal(); }
      const kbData = { script:{title:'Script de prospección',html:`<p>Mensaje inicial autorizado para DIGITEM Salud.</p><pre>${scriptText()}</pre>`}, evaluation:{title:'Criterios de Perspectiva Digital Express',html:'<div class="criteria-guide"><h4>Visibilidad local</h4><p>Revisa si el especialista puede encontrarse por servicio + zona. Considera Google Business Profile, sitio web, ubicación, especialidad y palabras clave locales.</p><h4>Confianza</h4><p>Observa si la presencia transmite profesionalismo: fotografía, tono humano, información actualizada, claridad del perfil y señales de autoridad.</p><h4>Claridad del servicio</h4><p>Evalúa si una persona entiende qué atiende, cómo puede ayudar, qué servicios ofrece y cuál es el primer paso para contactarle.</p><h4>Facilidad para WhatsApp</h4><p>Verifica si el botón o número está visible, si el mensaje es claro y si en móvil el contacto se realiza sin fricción.</p><h4>Presencia profesional</h4><p>Considera diseño, orden visual, velocidad percibida, consistencia, responsive y comparación frente a otros especialistas de la zona.</p><h4>Autoridad digital</h4><p>Revisa si existe contenido educativo, trayectoria, reseñas, certificaciones, testimonios o señales que respalden la experiencia profesional.</p></div>'}, guide:{title:'Guía de evaluación',html:'<ol><li>Comienza siempre con una fortaleza real.</li><li>Califica cada punto con evidencia visible.</li><li>Escribe observaciones concretas, no juicios.</li><li>Conecta cada oportunidad con visibilidad, confianza o WhatsApp.</li><li>Cierra con una recomendación simple y accionable.</li></ol>'}, objections:{title:'Cuándo usar cada respuesta',html:'<ul><li><strong>No me interesa:</strong> cerrar con respeto y dejar puerta abierta.</li><li><strong>Ya tengo página:</strong> reconocer la base existente y hablar de mejora, no reemplazo.</li><li><strong>No tengo presupuesto:</strong> validar el momento y mantener relación.</li></ul>'}, followup:{title:'Seguimiento',html:'<p>Usa seguimiento según temperatura del lead: frío, tibio o caliente. Puedes crear varios seguimientos por prospecto, registrar canal, fecha, mensaje, notas y resultado de cada interacción.</p><ul><li><strong>Pendiente:</strong> aún debes contactar.</li><li><strong>Realizado:</strong> ya se ejecutó y queda en historial.</li><li><strong>Cancelado:</strong> no aplica seguir por ahora.</li></ul>'}, client:{title:'Checklist de cliente',html:'<ol><li>Confirmar paquete y alcance.</li><li>Solicitar información básica del negocio.</li><li>Definir fecha de entrega estimada.</li><li>Preparar cotización o acuerdo.</li><li>Crear checklist de producción.</li></ol>'} };

      function copyText(encoded){ navigator.clipboard.writeText(decodeURIComponent(encoded)); showToast('Mensaje copiado'); }
      function escapeHtml(str=''){ return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

      $$('.nav-item[data-view]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
      $$('.nav-item[data-line], .line-card').forEach(btn => btn.addEventListener('click', () => setLine(btn.dataset.line)));
      $$('.filter').forEach(btn => btn.addEventListener('click', () => { state.status = btn.dataset.status; $$('.filter').forEach(f => f.classList.remove('active')); btn.classList.add('active'); renderProspects(); }));
      [el('newProspectTop'),el('newProspectCard'),el('newProspectEmpty')].forEach(b => b?.addEventListener('click', openProspectDialog));
      el('closeProspectDialog')?.addEventListener('click', closeProspectDialog);
      setupDeleteDialog();
      el('prospectForm')?.addEventListener('submit', createProspect);
      $$('.kb-item').forEach(btn => btn.addEventListener('click', () => openKb(btn.dataset.kb)));
      el('closeKbDialog')?.addEventListener('click', () => el('kbDialog').close());
      await loadProspects();
    
      })();
