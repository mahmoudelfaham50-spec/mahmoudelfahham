(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const text = (selector, value) => { const node=document.querySelector(selector);if(node&&value!==undefined&&value!==null)node.textContent=value; };
  const list = module => window.portfolioData?.content?.[module] || [];
  const meta = item => item?.meta || {};
  let cmsNotice=null;
  if(document.body.classList.contains('cms-enabled')){cmsNotice=document.createElement('div');cmsNotice.className='cms-status-notice';cmsNotice.innerHTML='<b>Loading portfolio content…</b>Connecting to the published portfolio records.';document.body.append(cmsNotice);}
  const dateLabel = item => meta(item).period || meta(item).date || 'PROFESSIONAL DEVELOPMENT';
  const mediaImage = (item, className='') => item.cover_url ? `<img class="${className}" src="${esc(item.cover_url)}" alt="${esc(item.cover_alt||item.title)}" loading="lazy">` : '';

  function updateProfile(profile, settings) {
    const name=profile.name||'Mahmoud Elfaham';
    document.querySelectorAll('.brand-name').forEach(node=>{const footer=node.closest('.footer-brand');node.innerHTML=`${esc(name.toUpperCase())}<small>${footer?'BIOMEDICAL ENGINEER & DATA ANALYST':'ENGINEERING · DATA · IMPACT'}</small>`;});
    document.querySelector('.brand[aria-label]')?.setAttribute('aria-label', `${name}, home`);
    const heading=document.querySelector('#hero-title');
    if(heading&&Object.hasOwn(profile,'headline')){const parts=(profile.headline||'').split('|').map(s=>s.trim()).filter(Boolean);heading.innerHTML=parts.length>1?`${esc(parts[0])}<br><span class="text-gradient">${esc(parts.slice(1).join(' · '))}</span>`:profile.headline?`<span class="text-gradient">${esc(profile.headline)}</span>`:'';}
    text('.hero-lede',profile.hero_intro);
    text('.about-lead',profile.about_lead);
    const heroMeta=document.querySelectorAll('.hero-meta span');if(heroMeta[0])heroMeta[0].textContent=`BASED IN ${(profile.location||'Egypt').toUpperCase()}`;if(heroMeta[1])heroMeta[1].textContent=(profile.major||'Biomedical & Systems Engineering').toUpperCase();
    const location=document.querySelector('.contact-location');if(location){location.innerHTML=`<span class="location-pulse"></span> ${esc((profile.location||'Egypt').toUpperCase())} <span>·</span> PROFESSIONAL CONTACT`;}
    const footerTitle=document.querySelector('.footer-brand .brand-name small');if(footerTitle&&profile.title)footerTitle.textContent=profile.title.toUpperCase();
    const aboutBody=document.querySelector('.about-body');
    if(aboutBody){aboutBody.querySelectorAll('p:not(.about-lead)').forEach(node=>node.remove());(profile.about_body||'').split(/\n\s*\n/).filter(Boolean).forEach(paragraph=>{const p=document.createElement('p');p.textContent=paragraph;aboutBody.append(p);});}
    const mini=document.querySelector('.about-title h2');if(mini&&profile.name){const first=profile.name.split(' ')[0];mini.innerHTML=`${esc(first)}’s work.<br><span class="text-muted">Many disciplines.</span>`;}
    const objective=document.querySelector('.objective-content h2');if(objective){const parts=(profile.career_objective||'').split(/\.(?:\s|$)/).filter(Boolean);const first=(parts.shift()||'').trim();objective.innerHTML=first?`${esc(first)}.${parts.length?` <span>${esc(parts.join('. ').trim())}</span>`:''}`:'';}
    const portrait=document.querySelector('.portrait-placeholder');if(portrait&&profile.portrait_url){portrait.innerHTML=`<img src="${esc(profile.portrait_url)}" alt="${esc(profile.portrait_alt||name)}"><span class="portrait-caption">${esc(name)}</span>`;portrait.classList.add('has-portrait');}
    const description=document.querySelector('meta[name="description"]');if(description&&Object.hasOwn(settings,'site_description'))description.content=settings.site_description;
    const ogDescription=document.querySelector('meta[property="og:description"]');if(ogDescription&&settings.site_description!==undefined)ogDescription.content=settings.site_description;
    const title=document.querySelector('title');if(title&&settings.site_title!==undefined)title.textContent=settings.site_title;
    const og=document.querySelector('meta[property="og:title"]');if(og&&settings.site_title!==undefined)og.content=settings.site_title;
    const tagline=document.querySelector('.footer-main>p');if(tagline&&settings.footer_tagline!==undefined){const parts=settings.footer_tagline.split('. ').filter(Boolean);tagline.innerHTML=parts.length>1?`${esc(parts.slice(0,-1).join('. ')+'.')}<br><span>${esc(parts.at(-1))}</span>`:esc(settings.footer_tagline);}
    const factCards=document.querySelectorAll('.facts-grid .fact-card');
    if(factCards[0]){factCards[0].querySelector('h3').textContent=profile.degree||'Biomedical Engineering Graduate';factCards[0].querySelector('p').textContent=`${profile.university||'Shorouk Academy'} · ${profile.graduation_year||'2026'}`;}
    if(factCards[1]){factCards[1].querySelector('h3').textContent=`${profile.current_position||'Professional'}${profile.current_organization?` at ${profile.current_organization}`:''}`;factCards[1].querySelector('p').textContent='Analytics, reporting & product thinking';}
    const languagesCard=document.querySelector('.languages-card');if(languagesCard){const rows=(profile.languages||'').split(/\r?\n/).map(line=>line.split(/[—–-]/).map(part=>part.trim())).filter(parts=>parts[0]);languagesCard.querySelectorAll('.language-row').forEach(row=>row.remove());rows.forEach(([language,level=''])=>{const normalized=level.toLowerCase();const segments=/native|c2|c1/.test(normalized)?5:/b2|b1/.test(normalized)?3:/a2/.test(normalized)?2:/a1/.test(normalized)?1:0;const row=document.createElement('div');row.className='language-row';row.innerHTML=`<span>${esc(language)}</span><span class="language-level">${esc(level.toUpperCase())}</span><div class="language-meter">${Array.from({length:5},(_,index)=>`<i class="${index<segments?'full':''}"></i>`).join('')}</div>`;languagesCard.querySelector('.language-caption')?.before(row);});}
    if(factCards[3])factCards[3].querySelector('p').textContent=`Graduation project · ${profile.project_grade||'Excellent'} grade`;
    const yearCounter=document.querySelector('.metrics-strip .count-up[data-count="2026"]');if(yearCounter&&/^\d{4}$/.test(profile.graduation_year||'')){yearCounter.dataset.count=profile.graduation_year;}
  }

  function updateProjects() {
    const items=list('projects');const grid=document.querySelector('.projects-grid');if(!grid)return;const medlink=items.find(item=>/medlink/i.test(item.title));const projectFact=document.querySelector('.facts-grid .fact-card:nth-child(4)');if(projectFact){projectFact.hidden=!medlink;if(medlink){projectFact.querySelector('h3').textContent=medlink.title;projectFact.querySelector('p').textContent=`Graduation project · ${meta(medlink).grade||'Project'}`;}}if(!items.length){grid.replaceChildren();const secondary=document.querySelector('.secondary-projects');if(secondary)secondary.hidden=true;return;}items.sort((a,b)=>Number(b.featured)-Number(a.featured));
    const primary=items.slice(0,5);const details={};
    grid.innerHTML=primary.map((item,index)=>{
      const m=meta(item);details[item.slug]={title:item.title,category:item.category,description:item.summary||item.body||'',notes:[item.body,m.role,m.grade?`Grade: ${m.grade}`:'',...(Array.isArray(m.achievements)?m.achievements:[])].filter(Boolean),images:item.images||[],url:m.project_url||''};
      const tags=Array.isArray(m.technologies)?m.technologies:[];const cardClass=index===0?'project-card project-featured':'project-card';const artClass=['art-medlink','art-maher','art-icu','art-spectro','art-eeg'][index]||'art-medlink';
      return `<article class="${cardClass}" tabindex="0" data-project="${esc(item.slug)}"><div class="project-art ${artClass}"><span class="art-label">PROJECT ${String(index+1).padStart(2,'0')} · ${esc(m.type||item.category||'SELECTED WORK').toUpperCase()}</span>${item.cover_url?`<img src="${esc(item.cover_url)}" alt="${esc(item.cover_alt||item.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`:`<div class="dynamic-art-mark">${index===0?'⌬':index===1?'✳':index===2?'▥':'⌁'}</div>`}<span class="art-caption">${esc(item.title.toUpperCase())}</span></div><div class="project-info"><div class="project-meta"><span>${esc(item.category||'PROJECT')}</span>${m.grade?`<span class="grade-pill">${esc(m.grade.toUpperCase())}</span>`:''}</div><h3>${esc(item.title)}</h3><p>${esc(item.summary||'')}</p><div class="project-tags">${tags.slice(0,4).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div><div class="project-bottom"><span>${esc(m.role||'PROJECT DETAILS')}</span><button class="text-button project-open" data-open="${esc(item.slug)}">View details <span>↗</span></button></div></div></article>`;
    }).join('');
    window.PortfolioProjectDetails=details;
    const secondary=document.querySelector('.secondary-grid');if(secondary){secondary.innerHTML=items.slice(5).map((item,index)=>{details[item.slug]={title:item.title,category:item.category,description:item.summary||item.body||'',notes:[item.body,...(meta(item).technologies||[])].filter(Boolean),images:item.images||[],url:meta(item).project_url||''};return `<button class="secondary-project" data-open="${esc(item.slug)}"><span>${String(index+1).padStart(2,'0')}</span><b>${esc(item.title)}</b><small>${esc(item.category)}</small><i>↗</i></button>`;}).join('');const wrap=document.querySelector('.secondary-projects');if(wrap)wrap.hidden=items.length<=5;}
    window.PortfolioProjectDetails=details;document.dispatchEvent(new Event('portfolio:updated'));
  }

  function updateExperience() {
    const items=list('experiences');const timeline=document.querySelector('.timeline');if(!timeline)return;const nti=items.find(item=>/nti|telecommunication institute/i.test(`${item.title} ${item.category}`));const metric=document.querySelector('.metrics-strip>div:nth-child(2)');if(metric){metric.hidden=!nti;if(nti){const counter=metric.querySelector('.count-up');if(counter){counter.dataset.count=String(meta(nti).hours||30);counter.textContent='0';window.animatePortfolioCounter?.(counter);}}}
    timeline.innerHTML=items.map((item,index)=>`<article class="timeline-item ${index===0?'timeline-current':''}"><div class="timeline-marker"></div><div class="timeline-date">${esc(dateLabel(item).toUpperCase())}${meta(item).employment?`<small>${esc(meta(item).employment.toUpperCase())}</small>`:''}</div><div class="timeline-content"><div class="timeline-top"><div><h3>${esc(item.title)}</h3><p class="company">${esc(item.category)}</p></div><span class="role-tag">${esc(index===0?'CURRENT':'EXPERIENCE')}</span></div><p>${esc(item.summary||'')}</p>${item.body?`<p>${esc(item.body)}</p>`:''}</div></article>`).join('');
  }

  function updateSkills() {
    const items=list('skills');const grid=document.querySelector('.skills-grid');if(!grid)return;
    const symbols=['▥','</>','⌁','✚','✳'];grid.innerHTML=items.map((item,index)=>{const skills=meta(item).items||[];return `<article class="skill-card ${index%2===0?'skill-card-large':''}"><span class="skill-index">${String(index+1).padStart(2,'0')}</span><span class="skill-symbol">${symbols[index%symbols.length]}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary||item.category)}</p><div class="tag-list">${skills.map(skill=>`<span>${esc(skill)}</span>`).join('')}</div></article>`;}).join('');
  }

  function updateAwards() {
    const items=list('achievements');const primaryNode=document.querySelector('.award-primary');const listNode=document.querySelector('.award-list');const student=items.find(item=>/student of the year/i.test(item.title));const thirdFact=document.querySelector('.facts-grid .fact-card:nth-child(3)');if(thirdFact){thirdFact.hidden=!student;if(student){thirdFact.querySelector('h3').textContent=student.title;thirdFact.querySelector('p').textContent=student.category;}}const military=items.find(item=>/military production/i.test(item.title));const ebdaa=items.find(item=>/ebdaa/i.test(item.title));const metric3=document.querySelector('.metrics-strip>div:nth-child(3)');const metric4=document.querySelector('.metrics-strip>div:nth-child(4)');if(metric3){metric3.hidden=!military;if(military)metric3.querySelector('strong').textContent=military.title.match(/3rd/i)?'3RD':military.title;}if(metric4){metric4.hidden=!ebdaa;if(ebdaa)metric4.querySelector('strong').textContent=ebdaa.title.match(/top\s*10/i)?'TOP 10':ebdaa.title;}if(!items.length){if(primaryNode)primaryNode.hidden=true;if(listNode)listNode.replaceChildren();const thumbs=document.querySelector('.certificate-row');if(thumbs)thumbs.replaceChildren();return;}
    const primary=items.find(item=>item.featured)||items[0];
    if(primaryNode){primaryNode.querySelector('.award-year').textContent=`${meta(primary).year||'RECOGNITION'} · ${esc(primary.category||'')}`;primaryNode.querySelector('.award-primary .eyebrow')?.remove();primaryNode.querySelector('h3').innerHTML=esc(primary.title).replace(' — ','<br>')+'<span>.</span>';const ps=primaryNode.querySelectorAll('p');if(ps.length)ps[ps.length-1].textContent=primary.summary||'';const proof=primaryNode.querySelector('.award-placeholder');if(proof&&primary.cover_url){proof.innerHTML=`<img src="${esc(primary.cover_url)}" alt="${esc(primary.cover_alt||primary.title)}" loading="lazy">`;}}
    if(primaryNode)primaryNode.hidden=false;if(listNode)listNode.innerHTML=items.filter(item=>item.id!==primary.id).map((item,index)=>`<article class="award-item"><span class="award-no">${String(index+2).padStart(2,'0')}</span><div><span>${esc(item.category||'ACHIEVEMENT').toUpperCase()}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary||'')}</p></div><span class="award-symbol">↗</span></article>`).join('');
    const certs=list('certifications');const thumbs=document.querySelector('.certificate-row');if(thumbs)thumbs.innerHTML=certs.slice(0,4).map((item,index)=>`<button class="certificate-thumb" data-lightbox="${esc(item.title)}"><span>${String(index+1).padStart(2,'0')}</span>${mediaImage(item)}<i>✳</i><b>${esc(item.title.toUpperCase())}</b><small>${esc(item.category||'CERTIFICATE')}</small></button>`).join('');
  }

  function updateLeadership() {
    const items=list('leadership');const host=document.querySelector('.leadership-layout');if(!host)return;const teaching=document.querySelector('.teaching-card');if(teaching)teaching.hidden=!items.some(item=>/instructor|teaching/i.test(item.title));
    host.innerHTML=items.length?`<div class="leadership-main"><div class="leadership-ribbon">LEADERSHIP BEYOND ENGINEERING <span>✳</span></div>${items.map((item,index)=>`<article class="leadership-feature"><div class="leadership-number">${String(index+1).padStart(2,'0')}</div><div><p class="eyebrow">${esc(item.category||'LEADERSHIP')}</p><h3>${esc(item.title)}</h3><p>${esc(item.summary||'')}</p>${item.body?`<p>${esc(item.body)}</p>`:''}</div></article>`).join('')}</div><aside class="leadership-side"><div class="leadership-side-top"><span class="side-icon">✳</span><span>${items.length} LEADERSHIP ACTIVITIES</span></div><h3>Projects move forward together.</h3><p>Bringing people and ideas together through coordination, communication, and shared ownership.</p></aside>`:'';
  }

  function updateEvents() {
    const items=list('events');const grid=document.querySelector('.events-grid');if(!grid)return;
    grid.innerHTML=items.map((item,index)=>`<article class="event-card ${index===0?'event-main':''}"><div class="event-image placeholder-photo ${['photo-conference','photo-career','photo-graduation','photo-innovation'][index%4]}">${mediaImage(item)}<span class="photo-stamp">${item.cover_url?'': 'IMAGE<br>PLACEHOLDER'}</span><span class="image-number">${String(index+1).padStart(2,'0')}</span></div><div class="event-copy"><span>${esc(item.category||'EVENT').toUpperCase()}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary||'')}</p></div></article>`).join('');
  }

  function updateServices() {
    const items=list('services');const grid=document.querySelector('.services-grid');if(!grid)return;const icons=['▥','✚','⌁','✳'];
    grid.innerHTML=items.map((item,index)=>`<article class="service-card"><span>${String(index+1).padStart(2,'0')} / ${esc(item.category||'CONTRIBUTION').toUpperCase()}</span><i>${icons[index%icons.length]}</i><h3>${esc(item.title)}</h3><p>${esc(item.summary||'')}</p><a href="#contact">Discuss a project <b>↗</b></a></article>`).join('');
  }

  function updateGallery() {
    const items=list('gallery');const grid=document.querySelector('.gallery-grid');if(!grid)return;
    const catMap={project:'project',projects:'project',leadership:'leadership',events:'events',training:'training'};
    const filters=document.querySelector('.gallery-filters');if(filters){const cats=[...new Set(items.map(item=>catMap[item.category?.toLowerCase()]||'project'))];filters.innerHTML=`<button class="filter-button active" data-filter="all">All <span>${String(items.length).padStart(2,'0')}</span></button>${cats.map(cat=>`<button class="filter-button" data-filter="${cat}">${cat[0].toUpperCase()+cat.slice(1)}</button>`).join('')}`;filters.querySelectorAll('.filter-button').forEach(button=>button.addEventListener('click',()=>{filters.querySelectorAll('.filter-button').forEach(b=>b.classList.toggle('active',b===button));grid.querySelectorAll('.gallery-item').forEach(item=>item.hidden=button.dataset.filter!=='all'&&item.dataset.category!==button.dataset.filter);}));}
    grid.innerHTML=items.map((item,index)=>{const category=catMap[item.category?.toLowerCase()]||'project';return `<button class="gallery-item ${index===0?'gallery-tall':''} ${index===3?'gallery-wide':''}" data-category="${category}" data-lightbox="${esc(item.title)}"><span class="placeholder-photo photo-gallery-${['medlink','engineering','leadership','events','teaching','awards','professional'][index%7]}">${mediaImage(item)}<i>${String(index+1).padStart(2,'0')}</i><b>${esc(item.title.toUpperCase())}</b><small>${esc(item.cover_url?'OPEN IMAGE':'IMAGE PLACEHOLDER')}</small></span></button>`;}).join('');
  }

  function updateEducation() {
    const items=list('education');const card=document.querySelector('.learning-grid .learning-card');if(card){if(items.length){const item=items[0];card.hidden=false;card.querySelector('h3').textContent=item.title;card.querySelector('p').textContent=item.category;card.querySelector('.learning-foot').textContent=`GRADUATED ${meta(item).year||''} · ${meta(item).overall_grade||''} OVERALL · PROJECT: ${meta(item).project_grade||''}`;const bar=document.querySelector('.education-bar');if(bar){bar.hidden=false;bar.querySelector('h3').textContent=item.title;bar.querySelector('p').textContent=`${item.category} · ${meta(item).year||''} · Overall grade ${meta(item).overall_grade||''} · Graduation project: ${meta(item).project_grade||''}`;}}else{card.hidden=true;const bar=document.querySelector('.education-bar');if(bar)bar.hidden=true;}}
    const certs=list('certifications');const certCard=document.querySelectorAll('.learning-grid .learning-card')[1];if(certCard)certCard.querySelector('ul').innerHTML=certs.map(item=>`<li>${esc(item.title)}${meta(item).hours?` · ${esc(meta(item).hours)} hours`:''}${meta(item).completion?` · ${esc(meta(item).completion)}`:''}</li>`).join('');
  }

  function updateSocial() {
    const items=list('social_links');const host=document.querySelector('.contact-details');if(!host)return;
    const published=items.map(item=>{const label=meta(item).label||item.title;const content=`<span class="social-icon">${esc(label.slice(0,2))}</span><span><b>${esc(label)}</b><small>${esc(item.summary||item.category)}</small></span><i>${meta(item).url?'↗':'—'}</i>`;return meta(item).url?`<a href="${esc(meta(item).url)}" target="_blank" rel="noopener noreferrer" class="social-link">${content}</a>`:`<div class="social-link disabled-link">${content}</div>`;}).join('');
    const placeholders=[['github','GitHub','Profile link to be added','⌘'],['facebook','Facebook','Profile link to be added','f'],['email','Email','Professional address to be added','@']].filter(([key])=>!items.some(item=>`${item.slug} ${item.title}`.toLowerCase().includes(key))).map(([,label,description,icon])=>`<div class="social-link disabled-link"><span class="social-icon">${icon}</span><span><b>${label}</b><small>${description}</small></span><i>—</i></div>`).join('');
    host.innerHTML='<span class="contact-label">FIND ME ONLINE</span>'+published+placeholders;
    const footer=document.querySelector('.footer-social');if(footer)footer.innerHTML=items.filter(item=>meta(item).url).slice(0,3).map(item=>`<a href="${esc(meta(item).url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(meta(item).label||item.title)}">${esc((meta(item).label||item.title).slice(0,2))} ↗</a>`).join('');
  }

  async function hydrate() {
    try {
      const response=await fetch('api/public.php',{headers:{'Accept':'application/json'},cache:'no-store'});if(!response.ok)throw new Error('');
      window.portfolioData=await response.json();const data=window.portfolioData;
      updateProfile(data.profile||{},data.settings||{});updateProjects();updateExperience();updateSkills();updateAwards();updateLeadership();updateEvents();updateServices();updateGallery();updateEducation();updateSocial();
      document.dispatchEvent(new Event('portfolio:updated'));
      document.body.classList.add('cms-ready');cmsNotice?.remove();
    } catch (_) {
      if(cmsNotice)cmsNotice.innerHTML='<b>Portfolio content is temporarily unavailable.</b>Please check the CMS database configuration and try again.';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrate,{once:true});else hydrate();
})();
