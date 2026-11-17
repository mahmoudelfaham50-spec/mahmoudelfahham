(() => {
  'use strict';
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const viewRoot = document.querySelector('#view-root');
  const toast = document.querySelector('#toast');
  const dialog = document.createElement('dialog'); dialog.className = 'admin-dialog'; dialog.id = 'record-dialog'; document.body.append(dialog);
  const titles = {profile:'Profile & About',projects:'Projects',experiences:'Experience & Training',skills:'Technical Skills',achievements:'Achievements & Awards',certifications:'Certifications',education:'Education',leadership:'Leadership & Activities',events:'Events',gallery:'Gallery',services:'Professional Services',social_links:'Social Links',media:'Media Library',settings:'Website Settings'};
  const configs = {
    projects:{singular:'Project',meta:[['type','Project type'],['technologies','Technologies (comma separated)','list'],['role','My role'],['grade','Grade'],['project_url','Project URL'],['achievements','Achievements (one per line)','lines'],['additional_media_ids','Additional project images','multi']]},
    experiences:{singular:'Experience / Training',meta:[['period','Period / date'],['employment','Employment type'],['previous','Previous experience'],['hours','Training hours'],['skills','Key skills (comma separated)','list']]},
    skills:{singular:'Skill category',meta:[['items','Skills (comma separated)','list']]},
    achievements:{singular:'Achievement',meta:[['year','Year'],['recognition','Recognition level'],['academic_year','Academic year'],['project','Related project']]},
    certifications:{singular:'Certification',meta:[['issuer','Issuer'],['date','Date'],['hours','Hours'],['completion','Completion status'],['credential_url','Credential URL']]},
    education:{singular:'Education record',meta:[['year','Graduation year'],['overall_grade','Overall grade'],['project_grade','Project grade'],['institution','Institution'],['degree','Degree']]},
    leadership:{singular:'Leadership activity',meta:[['organization','Organization'],['progression','Progression (comma separated)','list'],['period','Period']]},
    events:{singular:'Event',meta:[['type','Event type'],['period','Period / date'],['responsibility','My responsibilities']]},
    gallery:{singular:'Gallery image',meta:[['alt','Alt text'],['gallery_category','Gallery category']]},
    services:{singular:'Professional service',meta:[['icon','Icon symbol']]},
    social_links:{singular:'Social link',meta:[['url','Profile URL'],['label','Display label']]}
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const notify = (message, error=false) => { toast.textContent=message; toast.classList.toggle('error',error); toast.classList.add('show'); clearTimeout(notify.timer); notify.timer=setTimeout(()=>toast.classList.remove('show'),3200); };
  async function request(url, options={}) {
    const response = await fetch(url, {credentials:'same-origin', ...options});
    const data = await response.json().catch(()=>({error:'The server returned an invalid response.'}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  const apiPost = (body, endpoint='admin.php') => request(`../api/${endpoint}`, {method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});
  function setHeading(view) { document.querySelector('#topbar-title').textContent=titles[view]||'Overview'; }
  function setActive(view) { document.querySelectorAll('.sidebar-link').forEach(button=>button.classList.toggle('active',button.dataset.view===view)); }

  const loginForm = document.querySelector('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async event=>{
      event.preventDefault(); const message=loginForm.querySelector('.form-message'); message.textContent='Signing in…';
      try {
        const result=await request('../api/auth.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({action:'login',username:loginForm.username.value,password:loginForm.password.value})});
        if(result.ok) location.reload();
      } catch(error) { message.textContent=error.message; }
    });
    return;
  }
  if (!viewRoot) return;

  async function renderOverview() {
    const data=await request('../api/admin.php'); const c=data.counts;
    const cards=[['Projects',c.projects,'▧'],['Achievements',c.achievements,'✳'],['Certificates',c.certifications,'▤'],['Experience records',c.experiences,'◷'],['Gallery images',c.gallery,'▨'],['Skills',c.skills,'⌘']];
    viewRoot.innerHTML=`<div class="page-head"><div><p class="eyebrow">YOUR PORTFOLIO AT A GLANCE</p><h1>Good to see you, ${esc(data.admin)}.</h1><p>Manage the content that appears on your public portfolio.</p></div></div><div class="stats-grid">${cards.map(([label,value,icon])=>`<article class="stat-card"><span>${label.toUpperCase()}</span><i>${icon}</i><strong>${Number(value)||0}</strong></article>`).join('')}</div><div class="dashboard-lower"><section class="panel"><h2>Quick actions</h2><div class="quick-grid"><button class="quick-link" data-action-view="projects">Add a project<span>Publish new work to your portfolio</span></button><button class="quick-link" data-action-view="achievements">Add an achievement<span>Record a new award or recognition</span></button><button class="quick-link" data-action-view="media">Upload images<span>Organize project and gallery photos</span></button><button class="quick-link" data-action-view="profile">Edit profile<span>Update your introduction and details</span></button></div></section><section class="panel"><h2>Publishing notes</h2><p class="notice"><b>Drafts stay private.</b> Records appear on your public site only after you set their status to Published. The public page keeps its existing layout; published content fills the current sections.</p><p class="notice">Uploaded media accepts JPEG, PNG, and WebP up to 8 MB. Add useful alt text so images remain accessible.</p></section></div>`;
    viewRoot.querySelectorAll('[data-action-view]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.actionView)));
  }

  function field(name,label,value='',type='text',full=false,help='') {
    const id=`field-${name}`; let control='';
    if(type==='textarea'||type==='json') control=`<textarea class="field-control ${type==='json'?'json':'textarea'}" id="${id}" name="${name}" ${type==='json'?'spellcheck="false"':''}>${esc(value)}</textarea>`;
    else if(type==='select'||type==='multiselect') control=`<select class="field-control" id="${id}" name="${name}" ${type==='multiselect'?'multiple':''}>${value}</select>`;
    else control=`<input class="field-control" id="${id}" name="${name}" type="${type}" value="${esc(value)}">`;
    return `<div class="field ${full?'full':''}"><label class="field-label" for="${id}">${label}</label>${control}${help?`<p class="field-help">${help}</p>`:''}</div>`;
  }
  function mediaOptions(selected='',multiple=false) {
    const selectedIds=(Array.isArray(selected)?selected:[selected]).map(String);
    return request('../api/media.php').then(({items})=>`${multiple?'':'<option value="">No image selected</option>'}${items.map(item=>`<option value="${item.id}" ${selectedIds.includes(String(item.id))?'selected':''}>#${item.id} · ${esc(item.original_name)}</option>`).join('')}`);
  }
  function decodeMeta(value) { if(typeof value==='object'&&value)return value; try{return JSON.parse(value||'{}')}catch(_){return {}} }

  async function openRecordEditor(view,record=null) {
    const config=configs[view]||{singular:'Record',meta:[]}; const meta=decodeMeta(record?.meta_json||record?.meta);
    let coverOptions=''; try{coverOptions=await mediaOptions(record?.cover_media_id);}catch(_){coverOptions='<option value="">Media list unavailable</option>';}
    const common=`${field('title','Title',record?.title||'')}${field('slug','URL slug',record?.slug||'','text',false,'Leave blank to generate from the title.')}${field('category','Category',record?.category||'')}${field('summary','Short description',record?.summary||'','textarea',true)}${field('body','Full description / details',record?.body||'','textarea',true)}${field('cover_media_id','Cover image',coverOptions,'select',true,'Upload and manage files in the Media Library, then select one here.')}`;
    let extra=(config.meta||[]).map(([key,label,kind])=>{const value=meta[key]??'';if(kind==='multi')return '';const display=Array.isArray(value)?value.join(kind==='lines'?'\n':', '):value;return field(`meta_${key}`,label,display,kind==='lines'?'textarea':'text',true);}).join('');
    if(view==='projects'){let options='';try{options=await mediaOptions(meta.additional_media_ids||[],true);}catch(_){options='';}extra+=field('meta_additional_media_ids','Additional project images',options,'multiselect',true,'Select uploaded images. Use Ctrl (Windows) or Command (Mac) to choose more than one. Upload files in Media Library first.');}
    const status=`<div class="field"><label class="field-label" for="field-status">Publication status</label><select class="field-control" id="field-status" name="status"><option value="draft" ${record?.status!=='published'?'selected':''}>Draft · private</option><option value="published" ${record?.status==='published'?'selected':''}>Published · visible publicly</option></select></div>${field('sort_order','Display order',record?.sort_order??0,'number')}`;
    dialog.innerHTML=`<div class="dialog-head"><h2>${record?'Edit':'Add'} ${esc(config.singular)}</h2><button type="button" class="dialog-x" aria-label="Close">×</button></div><form class="record-form"><div class="admin-hint">Content is saved to the database. It appears publicly only when its status is <b>Published</b>.</div><div class="form-grid">${common}${extra}${status}<div class="field"><label class="form-check"><input type="checkbox" name="featured" ${record?.featured?'checked':''}> Featured</label></div></div><div class="dialog-actions"><button type="button" class="admin-button cancel">Cancel</button><button class="admin-button primary" type="submit">Save ${esc(config.singular)}</button></div><p class="form-message" aria-live="polite"></p></form>`;
    dialog.querySelectorAll('.dialog-x,.cancel').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('form').addEventListener('submit',async event=>{
      event.preventDefault(); const form=event.currentTarget;const message=form.querySelector('.form-message');const data=new FormData(form);const builtMeta={};
      (config.meta||[]).forEach(([key,,kind])=>{if(kind==='multi'){builtMeta[key]=data.getAll(`meta_${key}`).map(Number).filter(Number.isInteger);return;}const raw=String(data.get(`meta_${key}`)||'').trim();builtMeta[key]=kind==='lines'?raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean):kind==='list'?raw.split(',').map(s=>s.trim()).filter(Boolean):raw;});
      const recordData={title:data.get('title'),slug:data.get('slug'),category:data.get('category'),summary:data.get('summary'),body:data.get('body'),cover_media_id:data.get('cover_media_id'),status:data.get('status'),sort_order:data.get('sort_order'),featured:data.get('featured')==='on',meta:builtMeta};
      try{await apiPost({action:'save',module:view,id:record?.id,record:recordData});dialog.close();notify('Changes saved.');await renderView(view);}catch(error){message.textContent=error.message;}
    });
    dialog.showModal();
  }

  async function renderRecords(view) {
    const {items}=await request(`../api/admin.php?module=${encodeURIComponent(view)}`);const config=configs[view]||{singular:'Record'};
    viewRoot.innerHTML=`<div class="page-head"><div><p class="eyebrow">CONTENT MANAGEMENT</p><h1>${esc(titles[view])}</h1><p>${items.length} record${items.length===1?'':'s'} · Drafts remain private until published.</p></div><button class="admin-button primary" id="add-record">+ Add ${esc(config.singular)}</button></div>${items.length?`<div class="table-wrap"><table><thead><tr><th>TITLE</th><th>CATEGORY</th><th>STATUS</th><th>ORDER</th><th>ACTIONS</th></tr></thead><tbody>${items.map(item=>`<tr><td><strong>${esc(item.title)}</strong><br><small>${esc(item.slug)}</small></td><td>${esc(item.category||'—')}</td><td><span class="status-pill ${item.status}">${item.status.toUpperCase()}</span></td><td>${Number(item.sort_order)||0}</td><td><div class="row-actions"><button class="small-button" data-edit="${item.id}">Edit</button><button class="small-button danger" data-delete="${item.id}" data-title="${esc(item.title)}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`:`<div class="panel empty-state">No ${esc(titles[view].toLowerCase())} yet. Add the first record to get started.</div>`}`;
    viewRoot.querySelector('#add-record').addEventListener('click',()=>openRecordEditor(view));
    viewRoot.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>openRecordEditor(view,items.find(item=>String(item.id)===button.dataset.edit))));
    viewRoot.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',async()=>{if(!confirm(`Delete “${button.dataset.title}”? This cannot be undone.`))return;try{await apiPost({action:'delete',module:view,id:Number(button.dataset.delete)});notify('Record deleted.');await renderView(view);}catch(error){notify(error.message,true);}}));
  }

  async function renderProfile() {
    const {profile}=await request('../api/admin.php?module=profile'); const p=profile||{};
    let portraitOptions='<option value="">No portrait selected</option>';
    try { portraitOptions=await mediaOptions(p.portrait_media_id); } catch (_) {}
    const fields=[['name','Full name'],['title','Professional title'],['headline','Hero headline'],['location','Location'],['current_position','Current position'],['current_organization','Current organization'],['university','University'],['institution','Institution'],['major','Major'],['degree','Degree'],['graduation_year','Graduation year'],['overall_grade','Overall grade'],['project_grade','Graduation project grade']];
    viewRoot.innerHTML=`<div class="page-head"><div><p class="eyebrow">PERSONAL BRAND</p><h1>Profile & About</h1><p>These details populate your current hero and About section.</p></div></div><form class="panel cms-form"><div class="form-grid">${fields.map(([name,label])=>field(name,label,p[name]||'')).join('')}${field('hero_intro','Hero introduction',p.hero_intro||'','textarea',true)}${field('about_lead','About lead paragraph',p.about_lead||'','textarea',true)}${field('about_body','About narrative (separate paragraphs with blank lines)',p.about_body||'','textarea',true)}${field('career_objective','Career objective',p.career_objective||'','textarea',true)}${field('languages','Languages (one per line: name — level)',p.languages||'','textarea',true)}${field('portrait_media_id','Professional portrait',portraitOptions,'select',true,'Upload a portrait in Media Library, then select it here.')}</div><div class="dialog-actions"><button class="admin-button primary" type="submit">Save profile</button></div><p class="form-message" aria-live="polite"></p></form>`;
    viewRoot.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const data=Object.fromEntries(new FormData(form));try{await apiPost({action:'profile-save',data});notify('Profile updated.');}catch(error){form.querySelector('.form-message').textContent=error.message;}});
  }

  async function renderSettings() {
    const {settings={}}=await request('../api/admin.php?module=settings');const entries={site_title:'SEO title',site_description:'SEO description',footer_tagline:'Footer tagline'};
    viewRoot.innerHTML=`<div class="page-head"><div><p class="eyebrow">SITE CONFIGURATION</p><h1>Website Settings</h1><p>Manage metadata and portfolio-wide text settings.</p></div></div><form class="panel cms-form"><div class="form-grid">${Object.entries(entries).map(([key,label])=>field(key,label,settings[key]||'',key==='site_description'?'textarea':'text',true)).join('')}</div><div class="dialog-actions"><button class="admin-button primary" type="submit">Save settings</button></div><p class="form-message" aria-live="polite"></p></form>`;
    viewRoot.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;try{await apiPost({action:'settings-save',data:Object.fromEntries(new FormData(form))});notify('Website settings saved.');}catch(error){form.querySelector('.form-message').textContent=error.message;}});
  }

  async function renderMedia() {
    const {items}=await request('../api/media.php');
    viewRoot.innerHTML=`<div class="page-head"><div><p class="eyebrow">CENTRAL MEDIA LIBRARY</p><h1>Media Library</h1><p>${items.length} images · JPEG, PNG, or WebP · Up to 8 MB per image.</p></div></div><form class="upload-panel" id="upload-form" enctype="multipart/form-data"><div class="form-grid"><div class="field"><label class="field-label" for="media-files">Choose image files</label><input id="media-files" type="file" name="files[]" accept="image/jpeg,image/png,image/webp" multiple required></div><div class="field"><label class="field-label" for="media-category">Category</label><select id="media-category" name="category" class="field-control"><option value="general">General</option><option value="projects">Projects</option><option value="awards">Awards</option><option value="certificates">Certificates</option><option value="gallery">Gallery</option><option value="events">Events</option><option value="profile">Profile</option></select></div>${field('alt_text','Alt text (applies to selected files)','','text')}${field('description','Description (optional)','','text')}</div><div class="upload-preview" id="upload-preview"></div><button class="admin-button primary" type="submit">Upload selected images</button><p class="form-message" aria-live="polite"></p></form>${items.length?`<div class="media-grid">${items.map(item=>`<article class="media-card"><img src="${esc(item.thumbnail_url||item.url)}" alt="${esc(item.alt_text||'')}" loading="lazy"><div class="media-card-body"><strong title="${esc(item.original_name)}">${esc(item.original_name)}</strong><small>${Number(item.width)||'?'} × ${Number(item.height)||'?'} · ID ${item.id} · ${Number(item.usage_count)||0} use(s)</small><div class="media-actions"><button class="small-button" data-media-edit="${item.id}">Edit details</button><button class="small-button danger" data-media-delete="${item.id}" data-uses="${item.usage_count}">Delete</button></div></div></article>`).join('')}</div>`:`<div class="panel empty-state">No images yet. Upload project covers, certificates, event photos, and gallery images.</div>`}`;
    const uploadForm=viewRoot.querySelector('#upload-form');const input=uploadForm.querySelector('input[type=file]');
    input.addEventListener('change',()=>{viewRoot.querySelector('#upload-preview').innerHTML=[...input.files].map(file=>`<img alt="Preview: ${esc(file.name)}" src="${URL.createObjectURL(file)}">`).join('');});
    uploadForm.addEventListener('submit',async event=>{event.preventDefault();const message=uploadForm.querySelector('.form-message');const data=new FormData(uploadForm);data.append('action','upload');try{await request('../api/media.php',{method:'POST',headers:{'X-CSRF-Token':csrf},body:data});notify('Images uploaded.');await renderView('media');}catch(error){message.textContent=error.message;}});
    viewRoot.querySelectorAll('[data-media-edit]').forEach(button=>button.addEventListener('click',()=>editMedia(items.find(item=>String(item.id)===button.dataset.mediaEdit))));
    viewRoot.querySelectorAll('[data-media-delete]').forEach(button=>button.addEventListener('click',async()=>{if(Number(button.dataset.uses)>0){notify('Image is in use. Remove its content assignment first.',true);return;}if(!confirm('Delete this image permanently?'))return;try{await apiPost({action:'delete',id:Number(button.dataset.mediaDelete)},'media.php');notify('Image deleted.');await renderView('media');}catch(error){notify(error.message,true);}}));
  }

  function editMedia(item) {
    dialog.innerHTML=`<div class="dialog-head"><h2>Edit image details · ID ${item.id}</h2><button class="dialog-x" type="button">×</button></div><form class="record-form"><img src="${esc(item.url)}" alt="" style="max-width:100%;max-height:220px;object-fit:contain"><div class="form-grid">${field('alt_text','Alt text',item.alt_text||'')}${field('category','Category',item.category||'general')}${field('description','Description',item.description||'','textarea',true)}</div><div class="dialog-actions"><button type="button" class="admin-button cancel">Cancel</button><button class="admin-button primary">Save details</button></div><p class="form-message"></p></form>`;
    dialog.querySelectorAll('.dialog-x,.cancel').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const data=Object.fromEntries(new FormData(form));try{await apiPost({action:'update',id:item.id,...data},'media.php');dialog.close();notify('Image details updated.');await renderView('media');}catch(error){form.querySelector('.form-message').textContent=error.message;}});dialog.showModal();
  }

  async function renderView(view) {
    setHeading(view);setActive(view);
    try {
      if(view==='overview')await renderOverview();else if(view==='profile')await renderProfile();else if(view==='settings')await renderSettings();else if(view==='media')await renderMedia();else await renderRecords(view);
    } catch(error) { viewRoot.innerHTML=`<div class="panel empty-state">${esc(error.message)} <button class="small-button" id="retry">Retry</button></div>`;viewRoot.querySelector('#retry')?.addEventListener('click',()=>renderView(view)); }
  }
  function navigate(view) {renderView(view);document.querySelector('#sidebar').classList.remove('open');}
  document.querySelectorAll('.sidebar-link').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
  document.querySelector('#sidebar-toggle')?.addEventListener('click',()=>document.querySelector('#sidebar').classList.toggle('open'));
  document.querySelector('#logout-button')?.addEventListener('click',async()=>{try{await request('../api/auth.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({action:'logout'})});location.reload();}catch(error){notify(error.message,true);}});
  renderView('overview');
})();
