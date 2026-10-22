/* Extract customer facts independently of the pending dialogue step. */
(function(root){'use strict';const L=root.iHolyTechAssistantLanguage;
 const NUM='(\\d[\\d,.]*(?:\\s*(?:thousand|million|hundred|k\\b|m\\b|الف|الاف|آلاف|مليون))?)';
 function number(raw){const s=L.normalize(raw).replace(/,/g,'');const n=parseFloat(s);const multiplier=/million|مليون|m$/.test(s)?1e6:/thousand|الف|الاف|آلاف|k$/.test(s)?1e3:/hundred/.test(s)?100:1;return Number.isFinite(n)&&n>=0?n*multiplier:null;}
 function fact(value,source,extra={}){return Object.assign({value,certainty:'explicit',source:source.slice(0,180)},extra);}
 function deniedPlatforms(s){const denied=[];for(const [id,term]of [['WooCommerce','woocommerce|ووكومرس|وو كومرس'],['WordPress','wordpress|وورد\\s*بريس|ورد\\s*بريس']])if(new RegExp("(?:(?:don't|do not|not|never|مش|لا|لست)\\s*(?:(?:use|using|want|need|require|بستخدم|باستخدم|بستعمل|عايز|محتاج|استخدم)\\s*)?|ما\\s*(?:بستخدمش|باستخدمش|بستعملش)\\s*)(?:an? )?(?:"+term+")").test(s))denied.push(id);return denied;}
 function positive(s){for(const id of deniedPlatforms(s)){const term=id==='WooCommerce'?'woocommerce|ووكومرس|وو كومرس':'wordpress|وورد\\s*بريس|ورد\\s*بريس';s=s.replace(new RegExp(term,'g'),'');}return s.replace(/(?:do not want|don't want|don't use|not using|without|non[- ]|not |مش عايز|بدون)\s*(?:a |an )?(?:wordpress|ووردبريس|woocommerce|cloud|shared|reseller)/g,'');}
 function extractBase(raw,profile={},flow={}){const s=L.normalize(raw),p=positive(s).replace(/(?:not|no|مش|ما عنديش|ليس|ليست)\s*(?:an? |عندي )?(?:online )?(?:store|shop|ecommerce|متجر)/g,''),facts={},clears=[],ambiguities=[];const denied=deniedPlatforms(s);if(denied.length){facts.deniedPlatforms=fact(denied,raw);if(denied.includes(profile.platform?.value))clears.push('platform');if(denied.includes('WooCommerce'))facts.ecommercePlatform=fact('other_unspecified',raw);}const hypothetical=/\b(?:if|suppose|supposing|hypothetical|eventually|in future|in the future|grows?|growing|reaches|will reach|when)\b|(?:^|[ ،])لو |في المستقبل|كبر|زاد/.test(s)&&/visit|traffic|user|زيار|زوار/.test(s);if(/(?:do not want|don't use|not using|without|not |مش عايز|بدون)\s*(?:a )?(?:wordpress|ووردبريس)/.test(s))clears.push('platform');const correction=/correction|correct that|actually|instead|already told|make that|make it|forget|remove|not \d|مش \d|خليها|اقصد|قصدي|امسح|قلتلك|بقت|بدل/.test(s)||/(?:change|update|غير).*?(?:budget|traffic|visits|platform|website type|ميزاني|زيار|نوع الموقع)/.test(s);const question=/[?؟]|^(?:what|how|does|can|is|are|هل|ايه|عندكم|يعني)\b/.test(s);const standalone=!question&&/^(?:about|around|approximately|حوالي)?\s*\d[\d,.]*\s*(?:k|m|thousand|الف)?\s*(?:(?:monthly|شهريا|شهري)\s*)?(?:visits?|visitors?|products?|زيار|منتج)/.test(s);const owned=/help me (?:choose|select|find).*?for/.test(s)||standalone||/\b(?:i |my |we |our |need |have |want |planning|building)\b|انا|عندي|عايز|موقعي|متجري|ميزاني|متوقع|حابب/.test(s)||flow.active&&!question&&!/compar|explain|tell me|show|قارن|اشرح|اعرض|فرق|بكام/.test(s);
  if(/(?:forget|remove|clear|delete|امسح|انسي|الغ).*?(?:budget|ميزاني)/.test(s))clears.push('budget');
  if(/(?:forget|remove|clear|امسح|انسي).*?(?:traffic|visitors|زيار)/.test(s))clears.push('traffic');
  if(owned||correction||hypothetical){if(/\bwoocommerce\b|ووكومرس|وو كومرس/.test(p)){facts.platform=fact('WooCommerce',raw);facts.website=fact('online_store',raw);}else if(/\bwordpress\b|وورد\s*بريس|ورد\s*بريس/.test(p))facts.platform=fact('WordPress',raw);
   if(/store|shop|ecommerce|e-commerce|متجر/.test(p))facts.website=fact('online_store',raw);else if(/agency|client hosting|reseller|وكال|حسابات عملاء|ريسيلر|موزع/.test(p))facts.website=fact('agency',raw);else if(/application|web app|تطبيق/.test(p))facts.website=fact('application',raw);else if(/company|business site|business website|portfolio|شركة|شركه|بورتفوليو/.test(p))facts.website=fact('business',raw);else if(/blog|مدون/.test(p))facts.website=fact('blog',raw);else if(/website|موقع/.test(p)&&!profile.website)facts.website=fact('website',raw);
   const products=s.match(new RegExp(NUM+'\\s*(?:products?|items?|skus?|منتج(?:ات)?)'))||s.match(new RegExp('(?:products?|منتج(?:ات)?)\\s*(?:count|عدد)?\\s*[:=]?\\s*'+NUM));if(products){const n=number(products[1]);if(n!==null)facts.products=fact(n,raw,{approximate:/about|around|approx|حوالي|تقريبا/.test(s)});}
   const futureStart=hypothetical?s.search(/\b(?:if|suppose|supposing|when|in the future)\b|(?:^|[ ،])لو /):-1,trafficText=hypothetical&&futureStart>=0?s.slice(futureStart):s;const traffic=trafficText.match(new RegExp(NUM+'\\s*(?:(?:monthly|per month|a month|شهري(?:ا)?|في الشهر)\\s*)?(?:visitors?|visits?|hits|زيار(?:ة|ه|ات)?|زوار)'))||trafficText.match(new RegExp('(?:monthly (?:visitors?|visits?)|traffic|زيارات شهرية)\\s*[:=]?\\s*'+NUM));if(traffic){const n=number(traffic[1]);if(n!==null)facts.traffic=fact(n,raw,{period:/month|شهري|في الشهر/.test(trafficText)?'month':(profile.traffic?.period||(flow.expect==='traffic'?'month':null)),approximate:/about|around|approx|حوالي|تقريبا/.test(s)});}
   if(/(?:not sure|unknown|no fixed|unsure|مش متاكد|لا اعرف).*(?:budget|ميزاني)|(?:budget|ميزاني).*(?:not sure|unknown|no fixed|مش متاكد)/.test(s))clears.push('budget');
   if(!clears.includes('budget')){let match=null,currency=null;const budgetContext=/budget|spend|afford|make that|make it|خليها|ميزاني|اقدر ادفع/.test(s)||flow.expect==='budget'||(correction&&profile.budget&&/[$£€]|usd|dollar|دولار/.test(s))||(/^\s*[$£€]\s*\d/.test(s)&&flow.active);if(budgetContext){match=s.match(/([$£€])\s*(\d[\d,.]*)/);if(match){currency=match[1]==='$'?'USD':match[1]==='£'?'GBP':'EUR';match=[match[0],match[2]];}else{match=s.match(new RegExp(NUM+'\\s*(usd|dollars?|eur|euros?|gbp|pounds?|دولار|يورو|جنيه)'));if(match)currency=/usd|dollar|دولار/.test(match[2])?'USD':/eur|euro|يورو/.test(match[2])?'EUR':'GBP';else match=s.match(new RegExp('(?:budget|spend|ميزاني(?:تي|ه|ة)?)\\D{0,25}'+NUM))||flow.expect==='budget'&&s.match(new RegExp('^\\s*'+NUM));}
    if(!match&&correction&&profile.budget&&/make (?:that|it)|خليها/.test(s))match=s.match(/(?:make (?:that|it)|خليها)\D{0,8}(\d[\d,.]*)/);if(match){const amount=number(match[1]);if(amount!==null){const explicitCurrency=s.match(/\b(usd|cad|aud|eur|gbp|aed|sar)\b/);currency=explicitCurrency?explicitCurrency[1].toUpperCase():currency||profile.budget?.currency||null;const priceStart=s.indexOf(match[0])+match[0].length,periodContext=s.slice(priceStart,priceStart+28);const year=/\/year|per year|annually|yearly|سنويا|سنوي/.test(periodContext),month=/\/month|per month|a month|monthly|شهري|الشهر/.test(periodContext)||/monthly budget|ميزاني(?:تي)? الشهرية/.test(s);if(/جنيه/.test(s))currency=/مصري/.test(s)?'EGP':/استرليني/.test(s)?'GBP':null;facts.budget=fact(amount,raw,{currency,period:year?'year':month?'month':profile.budget?.period||null,periodConfirmed:year||month||profile.budget?.periodConfirmed===true});}}
   }}
   const requirements=[['ssl',/\bssl\b|https|شهادة امان/],['backups',/backup|نسخ احتياط/],['caching',/cach|تخزين مؤقت/],['client_accounts',/client accounts?|account isolation|حسابات عملاء|فصل الحسابات/],['nodejs',/node\.?js/],['email',/email|ايميل|بريد/]];if(!question||/i need|i require|must have|احتاج|عايز|لازم/.test(s)){const req=requirements.filter(([id,re])=>re.test(s)&&!new RegExp("(?:don't need|do not need|without|no need for|مش محتاج|مش عايز|لا احتاج)\\s*(?:an? )?(?:"+re.source+")").test(s)).map(([id])=>id);if(req.length)facts.requirements=fact(req,raw);}
  }
  // Bare replies to a requested field still have a clear source and are not whole-sentence state values.
  if(flow.active&&!question&&!/compar|explain|tell me|show|قارن|اشرح|اعرض|فرق|بكام/.test(s)){if(flow.expect==='traffic'&&!facts.traffic&&!facts.products&&!facts.budget){const m=s.match(new RegExp('^(?:about|around|approximately|حوالي)?\\s*'+NUM+'\\s*$'));if(m)ambiguities.push({field:'metric',value:number(m[1])});}
   if(flow.expect==='website'&&!facts.website&&!facts.platform){if(/wordpress|ووردبريس/.test(p))facts.platform=fact('WordPress',raw);if(/company|business|شركة/.test(p))facts.website=fact('business',raw);}
  }
  if(owned||correction){
const domain=s.match(/\b(?:https?:\/\/)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})\b/i);if(domain)facts.domain=fact(domain[1],raw);
if(/(?:do not have|don't have|no|haven't got|ما عنديش|معنديش|ليس لدي|مش عندي)\s*(?:an? |عندي )?(?:domain|دومين|نطاق)/.test(s))facts.domainStatus=fact('not_owned',raw);else if(/(?:have|own|عندي|لدي)\s*(?:an? |my )?(?:domain|دومين|نطاق)/.test(s))facts.domainStatus=fact('owned',raw);
if(/(?:do not have|don't have|no|ما عنديش|معنديش)\s*(?:an? )?(?:hosting|استضافة)/.test(s))facts.hostingStatus=fact('not_hosted',raw);else if(/(?:already hosted|currently hosted|have (?:a domain and )?hosting|عندي.*(?:استضاف|hosting)|استضافة حاليا)/.test(s))facts.hostingStatus=fact('hosted',raw);
const sites=s.match(new RegExp(NUM+'\\s*(?:websites|sites|clients|مواقع|عملاء)'));if(sites)facts.websites=fact(number(sites[1]),raw);
const storage=s.match(/(\d+(?:\.\d+)?)\s*(gb|tb|جيجا|تيرا)(?:\s*(?:storage|disk|مساحة|تخزين))?/);if(storage)facts.storage=fact(Number(storage[1]),raw,{unit:/tb|تيرا/.test(storage[2])?'TB':'GB'});
if(/(?:need|want|عايز|محتاج).*?(?:migrat|move|transfer|انقل|نقل)/.test(s))facts.migration=fact('requested',raw);
if(facts.website&&facts.website.value!=='online_store'){clears.push('products');if(profile.platform?.value==='WooCommerce'&&!facts.platform)clears.push('platform');}
if(/not (?:concurrent )?users|مش مستخدم/.test(s)&&facts.traffic)clears.push('concurrentUsers');
}
const concurrent=s.match(new RegExp(NUM+'\\s*(?:concurrent users?|simultaneous users?|users? at once|مستخدم متزامن|مستخدمين متزامنين)'));if(concurrent){facts.concurrentUsers=fact(number(concurrent[1]),'customer metric');delete facts.traffic;} if(facts.traffic&&/per day|daily|يوميا/.test(s))facts.traffic.period='day';if(hypothetical){if(facts.traffic)facts.futureTraffic={...facts.traffic,hypothetical:true};for(const key of Object.keys(facts))if(key!=='futureTraffic')delete facts[key];clears.length=0;const marker=s.search(/\b(?:if|suppose|supposing|when|in the future)\b|(?:^|[ ،])لو /);if(marker>0){const current=extract(s.slice(0,marker),profile,{active:false});Object.assign(facts,current.facts);clears.push(...current.clears);}}if(!ambiguities.length&&!Object.keys(facts).length&&/^\s*\d[\d,.]*\s*(?:k|m|thousand|الف)?\s*$/.test(s))ambiguities.push({field:'metric',value:number(s)});for(const item of Object.values(facts))item.source='customer message';const removedRequirements=[];for(const [id,term]of [['ssl','ssl|https|شهادة امان'],['backups','backups?|نسخ احتياطي'],['email','email|mail|ايميل|بريد'],['caching','caching|cache|كاش']])if(new RegExp("(?:don't need|do not need|without|no need for|مش محتاج|مش عايز|لا احتاج)\\s*(?:an? )?(?:"+term+")").test(s))removedRequirements.push(id);return {facts,clears,correction,owned,ambiguities,removedRequirements,hypothetical};
 }
 function extract(raw,profile={},flow={}){const ex=extractBase(raw,profile,flow),s=L.normalize(raw),f=ex.facts;const question=/^(?:what|how|why|can |does |is |are |هل |ما هو|يعني)/.test(s)||/[?؟]/.test(s);
 const owns=ex.owned||ex.correction||/^(?:online store|store|blog|company website|portfolio|wordpress(?: website| site)?|reseller|agency|shared|متجر|مدونه|شركة|شركه)[.!\s]*$/.test(s);ex.owned=owns;
 if(owns&&!question){if(/^(?:online store|store|متجر)[.!\s]*$/.test(s))f.website=fact('online_store',raw);if(/^portfolio[.!\s]*$/.test(s))f.website=fact('portfolio',raw);if(/^wordpress(?: website| site)?[.!\s]*$/.test(s))f.platform=fact('WordPress',raw);if(/^(?:blog|مدونه)[.!\s]*$/.test(s))f.website=fact('blog',raw);}
 const bare=s.match(/^\s*(\d+(?:\.\d+)?)\s*[.!]*$/),correction=/make it|make that|change to|actually|instead|خليها|خليه|بدل|قصدي|غير|بلاش/.test(s);if(correction)ex.correction=true;
 if((owns||flow.active)&&!question){let sites=s.match(/(\d+)\s*(?:websites?|sites?|مواقع|موقع)(?!\s*(?:visits|زيار))/);if(sites)f.websites=fact(Number(sites[1]),raw);if(/(?:more than|over|اكتر من)\s*10.*(?:websites|sites|مواقع)/.test(s))f.websites=fact('more_than_10',raw);else if(flow.expect==='websites'&&/\d+\s*[–-]\s*\d+/.test(s)){const r=s.match(/(\d+)\s*[–-]\s*(\d+)/);f.websites=fact(Number(r[2]),raw,{range:[Number(r[1]),Number(r[2])]});}else if(flow.expect==='websites'&&bare)f.websites=fact(Number(bare[1]),raw);else if(flow.expect==='websites'&&/^(?:one|واحد|موقع واحد)/.test(s))f.websites=fact(1,raw);}
 const currencyMark=s.match(/\b(usd|egp|sar|aed|eur|gbp|cad|aud|dollars?|euros?|pounds?)\b|دولار|ريال|درهم|جنيه|يورو|[$€£]/);const context=!question&&(owns||flow.active)&&(currencyMark||/budget|spend|afford|ميزاني|خليها|خليه|make it|make that/.test(s)||flow.expect==='budget');
 if(context){let currency=currencyMark?({دولار:'USD',ريال:'SAR',درهم:'AED',جنيه:'EGP',يورو:'EUR','$':'USD','€':'EUR','£':'GBP'}[currencyMark[0]]||(/^dollar/.test(currencyMark[0])?'USD':/^euro/.test(currencyMark[0])?'EUR':/^pound/.test(currencyMark[0])?'GBP':currencyMark[0].toUpperCase())):profile.budget?.currency||(flow.expect==='budget'?'USD':null);const range=s.match(/(\d+(?:\.\d+)?)\s*(?:[–-]|to|الى|لـ?|ل)\s*(\d+(?:\.\d+)?)/);let amount=range?Number(range[2]):null;const m=s.match(/[$€£]\s*(\d+(?:\.\d+)?)/)||s.match(/(\d+(?:\.\d+)?)\s*(?:usd|egp|sar|aed|eur|gbp|cad|aud|dollars?|دولار|ريال|درهم|جنيه|يورو|[$€£])/i)||s.match(/(?:budget|make it|make that|خليها|خليه|ميزاني\S*)\D{0,20}(\d+(?:\.\d+)?)/)||(flow.expect==='budget'?bare:null);if(amount===null&&m)amount=Number(m[1]);
 const year=/per year|annually|yearly|\/year|سنوي|في السنه|في السنة/.test(s),month=/per month|monthly|\/month|\/mo\b|شهري|في الشهر/.test(s),previous=profile.budget;if(Number.isFinite(amount)&&amount>=0)f.budget=fact(amount,raw,{currency,period:year?'year':month?'month':previous?.period||(flow.expect==='budget'?'month':null),periodConfirmed:year||month||flow.expect==='budget'||previous?.periodConfirmed===true,...(range?{range:[Number(range[1]),Number(range[2])]}:{}),qualifier:/under|less than|اقل/.test(s)?'under':/over|more than|\d\s*\+|اكتر/.test(s)?'over':'maximum'});
 else if(previous&&(year||month||currencyMark))f.budget={...previous,currency:currency||previous.currency,period:year?'year':month?'month':previous.period,periodConfirmed:year||month||previous.periodConfirmed};}
 if(f.website&&f.website.value!==profile.website?.value)ex.clears.push('products');
 if(bare&&flow.expect==='budget'&&f.budget)ex.ambiguities=[];if(flow.expect==='websites'&&f.websites)ex.ambiguities=[];
 return consultFacts(raw,ex,profile,flow);
 }

 // Consultative facts: polarity is evaluated before positive classifications.
 function consultFacts(raw,ex,profile,flow){
  const s=L.arabicNumbers(L.normalize(raw).replace(/(^|\s)و(?=(?:اتنين|اثنين)(?:\s|$))/g,'$1')).replace(/\bwoo\b/g,'woocommerce').replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty)\b/g,n=>({one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',twelve:'12',twenty:'20'}[n])),k=L.arabicKey(s),f=ex.facts;
  const put=(id,value,extra={})=>{f[id]=fact(value,'customer message',extra);};
  const terms={woocommerce:'woocommerce|ووكومرس',wordpress:'wordpress|ووردبريس|وردبريس',ecommerce:'(?:online )?store|e-?commerce|متجر|sell products|ببيع منتجات',payments:'(?:online )?payments?|accept payments?|دفع(?: اونلاين)?|مدفوعات',subscriptions:'subscriptions?|recurring payments?|اشتراكات',memberships:'memberships?|عضويات',hosting:'hosting|استضافه|استضافة',shared:'shared(?: hosting)?|استضافه مشتركه',cloud:'cloud(?: hosting)?|كلاود|سحابي',reseller:'reseller|ريسيلر|موزع استضافه'};
  const polarity={};
  for(const [id,term] of Object.entries(terms)){
   const re=new RegExp(term,'g');let match;while((match=re.exec(k))){const before=k.slice(Math.max(0,match.index-65),match.index),near=before.split(/[;.!?،]|\bbut\b|\bhowever\b|لكن/).pop();
    const uncertain=/(?:don't|do not) know (?:if|whether)(?: it's| it is)?\s*$|not sure(?: if| whether)?(?: it's| it is)?\s*$|مش (?:عارف|متاكد)(?: اذا| ان| هو)?\s*$/.test(near);
    const negative=!uncertain&&/(?:\bnot|\bno|\bwithout|\bisn't|\bis not|\bdon't|\bdo not|\bdoesn't|\bdoes not|مش|مفيش|معنديش|مببيعش|لا احتاج|لا استخدم)\s*(?:(?:a|an|any|use|using|need|want|recommend|accept|sell|have|بستخدم|محتاج|عايز)\s+){0,4}$/.test(near);
    const coordinatedNegative=!uncertain&&new RegExp("(?:\\bno|\\bwithout|\\bnot|\\bdon't|\\bdo not|مفيش|بدون)\\s+(?:(?:"+Object.values(terms).join('|')+")\\s*(?:,|and|or|nor|و|ولا)\\s*)+$").test(near);
    polarity[id]=uncertain?'unknown':negative||coordinatedNegative?false:true;
   }
  }
  if(/مببيعش منتجات|مش ببيع منتجات/.test(k))polarity.ecommerce=false;if(/معنديش اشتراكات/.test(k))polarity.subscriptions=false;
  ex.polarity=polarity;
  for(const [id,key] of [['woocommerce','isWooCommerce'],['ecommerce','isEcommerce'],['payments','acceptsPayments'],['subscriptions','subscriptions'],['memberships','memberships']])if(id in polarity)put(key,polarity[id]);
  const platforms=[['WooCommerce',terms.woocommerce],['WordPress',terms.wordpress],['Laravel','laravel|لارافيل'],['Next.js','next\\.?js'],['Node.js','node\\.?js'],['Python','python|بايثون'],['HTML','html|static website']];
  const explicit=/\b(?:i|my|we|our|it|has|uses?|requires?|actually|\d+ (?:are|منهم|of them))\b|عندي|موقعي|عايز|محتاج|بتاع|اقصد|هو |هي /.test(k)||ex.owned||/\d+\s+منهم(?:\s|$)/.test(k)||!!flow.consultExpect||/^(?:please )?(?:migrat|move|transfer)/.test(k)||!/[?؟]/.test(k)&&!!profile.clientManagement&&/\b(?:each|every) client\b.*\b(?:needs?|requires?)\b/.test(k);
  if(polarity.woocommerce===false||polarity.woocommerce==='unknown'){
   if(f.platform?.value==='WooCommerce')delete f.platform;
   if(profile.platform?.value==='WooCommerce')ex.clears.push('platform');
   if(!/another|other|تاني|اخر/.test(k)){delete f.ecommercePlatform;ex.clears.push('ecommercePlatform');}
  }
  if(polarity.wordpress===false||polarity.wordpress==='unknown'){
   if(f.platform?.value==='WordPress')delete f.platform;
   if(profile.platform?.value==='WordPress')ex.clears.push('platform');
  }
  if(polarity.ecommerce===false){
   if(f.website?.value==='online_store')delete f.website;
   if(profile.website?.value==='online_store')ex.clears.push('website');
  }
  if(explicit){
   if(flow.consultExpect==='website'){if(/company|business|شرك/.test(k))put('website','business');else if(/blog|مدون/.test(k))put('website','blog');else if(/portfolio|بورتفوليو/.test(k))put('website','portfolio');}

   const found=platforms.filter(([id,term])=>new RegExp(term).test(k)&&polarity[id.toLowerCase()]!==false&&polarity[id.toLowerCase()]!=='unknown').map(([id])=>id);
   if(found.length){const custom=found.find(id=>['Laravel','Next.js','Node.js','Python'].includes(id));put('platform',custom||found[0]);put('platforms',found);if(custom){put('technicalReview',true);put('website','application');}}
   if(polarity.woocommerce==='unknown'&&!/store|متجر/.test(k)){delete f.website;}
   if(polarity.woocommerce===true){put('platform','WooCommerce');put('website','online_store');put('isEcommerce',true);}
   if(polarity.ecommerce===true)put('website','online_store');
   const counts=[['websites','(?:(?:client )?websites?|sites?|مواقع|موقع)'],['products','(?:products?|items?|منتج(?:ات)?)'],['emailAccounts','(?:(?:business )?email accounts?|mailboxes|(?:business )?emails|ايميلات|ايميل|بريد)'],['orders','(?:orders?|طلبات|طلب)'],['wordpressWebsites','(?:(?:are|منهم|of them) )?(?:wordpress|ووردبريس|وردبريس)(?: websites?| sites?)?'],['woocommerceWebsites','(?:(?:are|منهم|of them) )?(?:woocommerce|ووكومرس)(?: stores?| websites?| sites?)?']];
   for(const [id,term]of counts){const m=k.match(new RegExp('(\\d[\\d,.]*(?:\\s*k\\b)?)\\s*'+term));if(m)put(id,number(m[1]),id==='orders'?{period:/day|daily|يوم/.test(k)?'day':null}:{});}
   if(/\b(?:one|a|my) (?:wordpress )?(?:business )?(?:website|site)\b|موقع واحد/.test(k)&&!f.websites&&!profile.websites)put('websites',1);
   const traffic=k.match(/(\d[\d,.]*(?:\s*k\b)?)\s*(?:monthly\s*)?(?:visitors?|visits?|زيار(?:ات|ه)?|زوار)/);if(traffic&&!ex.hypothetical)put('traffic',number(traffic[1]),{period:/month|شهري|الشهر/.test(k)?'month':profile.traffic?.period||null});
   const runtime=k.match(/node\.?js|python|php|بي اتش بي/);if(runtime)put('runtime',/node/.test(runtime[0])?'Node.js':/python/.test(runtime[0])?'Python':'PHP');
   const db=k.match(/postgresql|postgres|mysql|mariadb|mongodb|sqlite/);if(db)put('database',db[0]);
   if(/server.side|\bssr\b|persistent|continuously running|سيرفر سايد/.test(k))put('serverProcess',/persistent|continuously running/.test(k)?true:'SSR');
   if(/first website|new website|launch.*(?:first|new)|موقع جديد|اول موقع/.test(k))put('websiteStatus','new');
   if(/already have|existing|i (?:have|run)|عندي موقع/.test(k))put('websiteStatus','existing');
   const provider=s.match(/(?:hosted (?:at|with|by)|provider is|host is)\s+([a-z][a-z0-9 -]{1,30})(?:[.!?,]|$)/);if(provider)put('hostingProvider',provider[1].trim());
   if(/not (?:live|built) yet|hasn't been built|لسه.*(?:مبني|اتعمل)/.test(k))put('websiteStatus','new');
   if(/keep|preserv|not.*lose|ضيع|احتفظ/.test(k)&&/messages|folders|email|رسايل|رسائل|ايميل/.test(k))put('preserveEmail',true);
   if(/without downtime|zero downtime|downtime|انقطاع|توقف/.test(k))put('downtimeConcern',true);
   if(/separate.*(?:accounts?|panels?)|حساب(?:ات)?.*(?:منفصل|مستقل)/.test(k))put('separateAccounts',!/(?:don't need|do not need|without|no)\s+(?:a |any )?separate.*(?:accounts?|panels?)|(?:مش محتاج|مش عايز|بدون).*حساب.*(?:منفصل|مستقل)/.test(k));
   if(/traffic spikes|spikes? in traffic|زيادات مفاجيه.*زيار|زيارات.*مفاجيه/.test(k))put('trafficSpikes',!/(?:no|without|don't have|do not have).*traffic spikes|مفيش.*زيارات.*مفاجيه/.test(k));
   if(/\blms\b|online courses?|learning management|دورات.*اونلاين/.test(k))put('courseWorkload',!/(?:no|without|don't have|do not have).*?(?:\blms\b|online courses?|learning management)|مفيش.*دورات/.test(k));
   if(/(?:heavy|resource.intensive|resource.heavy) plugins?|اضافات.*(?:تقيله|موارد)/.test(k))put('resourceHeavyPlugins',!/(?:no|without).*?(?:heavy|resource.intensive|resource.heavy) plugins?/.test(k));
   if(/freelanc|agency|client websites|عملا|وكال|مستقل/.test(k))put('clientManagement',true);
   if(/don't know.*(?:built|platform)|unknown platform|مش عارف.*(?:منصه|مبني)|not decided/.test(k)){put('platformUnknown',true);delete f.platform;ex.clears.push('platform');}
   if(/don't know anything|first website|beginner|مبتد|مش فاهم.*استضاف/.test(k))put('beginner',true);
   if(/\b(?:within|in)\s+\d+\s*(?:days?|weeks?|months?)|as soon as possible|خلال.*(?:يوم|اسبوع|شهر)/.test(k))put('timeline',(k.match(/(?:within|in)\s+\d+\s*(?:days?|weeks?|months?)|as soon as possible|خلال[^.!؟]{1,30}/)||[])[0]);
  }
  const domainOnly=/(?:only|just).*domain|domain only|دومين بس|نطاق فقط|مش محتاج.*hosting/.test(k)&&/domain|دومين|نطاق/.test(k);
  if(domainOnly)put('domainOnly',true);else if(/(?:also|now|actually|كمان|دلوقتي).*(?:need|want|عايز|محتاج).*hosting/.test(k))put('domainOnly',false);
  if(polarity.hosting===false)put('needsHosting',false);
  const moveClauses=k.split(/[;،]|\bbut\b|لكن/);const positiveMoves=moveClauses.filter(c=>/(?:migrat\w*|move|transfer|انقل|نقل|ترحيل)/.test(c)&&!/(?:don't|do not|not) (?:need |want )?(?:to )?(?:migrat|move)|مش عايز انقل|لا اريد نقل|should i move|should we move/.test(c));
  const migration=positiveMoves.some(c=>/site|hosting|them|email|موقع|مواقع|ايميل|بريد/.test(c));
  if(!migration&&/don't.*(?:migrat|move)|مش عايز انقل/.test(k)){delete f.migration;ex.clears.push('migration','requiresEmailMigration','downtimeConcern');}
  if(!migration&&/should i move|should we move/.test(k))delete f.migration;
  if(migration){put('migration',positiveMoves.some(c=>/site|hosting|them|موقع|مواقع/.test(c))?'website':'email');if(f.emailAccounts||profile.emailAccounts)put('requiresEmailMigration',true);put('websiteStatus','existing');}
  if(profile.migration&&(f.emailAccounts||f.preserveEmail))put('requiresEmailMigration',true);
  if(flow.consultExpect==='platform'&&/^(?:wordpress|woocommerce|laravel|html|php|node\.?js|next\.?js|ووردبريس|وردبريس)[.!؟?]*$/.test(k))ex.owned=true;
  const pending=flow.consultExpect,short=/^(?:yes|no|not sure|i'm not sure|unknown|ايوه|نعم|لا|مش متاكد)[.!؟?]*$/.test(k);
  if(['hostingAccess','backupsAvailable','persistentProcess','existingAccounts','subscriptions','separateAccounts'].includes(pending)&&/^(?:yes|yeah|no|ايوه|نعم|لا)(?:[,.!، ]|$)/.test(k))put(pending,!/^(?:no|لا)(?:[,.!، ]|$)/.test(k));
  if(pending==='specialFeatures'&&/no|none|without|لا|مفيش/.test(k))put('specialFeatures',false);
  if(pending==='traffic'&&/just starting|لسه ببدا/.test(k))put('traffic','just_starting',{period:'month'});
  if(pending==='emailAccounts'&&/^(?:no|none|لا|مفيش)[.!؟?]*$/.test(k))put('emailAccounts',0);
  if(pending==='specialFeatures'&&Object.keys(polarity).some(id=>['payments','subscriptions','memberships'].includes(id)&&polarity[id]===true))put('specialFeatures',true);
  if(['hostingAccess','backupsAvailable','persistentProcess','existingAccounts','specialFeatures','subscriptions','separateAccounts'].includes(pending)&&short)put(pending,/not sure|unknown|متاكد/.test(k)?'unknown':/^(?:no|لا)/.test(k)?false:true);
  if(pending&&/^\d[\d,.]*$/.test(k)&&['orders','concurrentUsers','traffic','websites','emailAccounts'].includes(pending)){put(pending,number(k),pending==='orders'?{period:'day'}:pending==='traffic'?{period:'month'}:{});ex.ambiguities=[];}
  if((pending==='hostingAccess'||/hosting|control panel|استضاف|لوحه/.test(k))&&/\b(?:have (?:hosting )?access|can access)|عندي وصول|معايا.*(?:دخول|لوحه)/.test(k))put('hostingAccess',true);
  if(/(?:no|don't have) access|معنديش.*(?:وصول|دخول)/.test(k))put('hostingAccess',false);
  if(/(?:have|recent|available).*backups?|نسخ.*(?:موجود|متاح)/.test(k)&&!/(?:no|without|don't have|do not have).*backups?/.test(k))put('backupsAvailable',true);
  if(pending==='existingAccounts'&&/already|elsewhere|existing|حاليا|عند.*شرك/.test(k))put(pending,true);
  if(pending==='trafficPattern'&&/all the time|always|busy|visitors.*active|طول الوقت|وقت الزحم/.test(k))put(pending,/all the time|always|طول الوقت/.test(k)?'constant':'busy');
  if(ex.correction&&/actually|اقصد|قصدي/.test(k)&&f.platform&&profile.platform?.value!==f.platform.value){ex.clears.push('platforms','isWooCommerce','isEcommerce','products','orders');if(f.platform.value!=='WooCommerce')ex.clears.push('ecommercePlatform');}
  if(ex.correction&&f.website&&f.website.value!=='online_store'){ex.clears.push('products','orders','subscriptions','ecommercePlatform');}
  if(ex.correction&&!f.websites&&!['budget','traffic','products','orders','emailAccounts'].some(id=>f[id])&&/meant|اقصد|قصدي/.test(k)&&profile.websites){const n=k.match(/\d+/);if(n){put('websites',Number(n[0]));ex.ambiguities=[];}}
  // Domains must have a genuine hostname shape; ordinary category words are never addresses.
  if(f.domain){const d=f.domain.value;const labels=d.split('.');if(d.length>253||labels.some(x=>!x||x.length>63||! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(x))||! /^[a-z]{2,63}$/i.test(labels[labels.length-1]))delete f.domain;}
  if((/email|e-mail|mailbox|ايميل|بريد/.test(k)&&/\b(?:my|our|i use|we use|i (?:also )?have|we have)\b|email is (?:hosted )?(?:on|with)|بريدي|ايميلاتي|عندي|البريد.*(?:عند|علي)/.test(k)||flow.consultExpect==='emailProvider'&&/^(?:microsoft\s*365|office\s*365|google workspace)[.!]*$/.test(k))&&!/^(?:should|can i use|do you offer|هل استخدم)/.test(k)){
   for(const m of k.matchAll(/microsoft\s*365|office\s*365|google workspace/g)){const name=/google/.test(m[0])?'Google Workspace':'Microsoft 365',before=k.slice(Math.max(0,m.index-25),m.index);if(/not (?:on|with)\s*$|مش (?:علي|عند)\s*$/.test(before)){if(profile.emailProvider?.value===name)ex.clears.push('emailProvider');}else put('emailProvider',name);}
  }
  ex.consult={migration,domainOnly,explicit,polarity};return reconcileFacts(raw,ex,profile,flow);
 }
 // Reconcile extracted facts with sentence ownership, polarity and certainty.
 // This is part of the existing extractor; no separate dialogue/recommendation engine.
 function reconcileFacts(raw,ex,profile,flow){
  const s=L.normalize(raw),k=s.replace(/ة/g,'ه'),f=ex.facts,put=(id,value,extra={})=>{f[id]=fact(value,'customer message',extra);};
  const correction=/actually|i meant|sorry.*correct|instead|forget that|لا[،, ]+قصدي|لا[،, ]*مش ده|قصدي|معلش.*اقصد|غيرت رايي/.test(k)||ex.correction;
  ex.correction=correction;
  const personal=/\b(?:i|we) (?:have|use|run|need|want|think|may|might|don't know|do not know)|\b(?:my|our)\b[^!?؟]{0,50}\b(?:website|site|app|application|store)\b|عندي|موقعي|متجري|عايز|محتاج|بستخدم|بيستخدم|قصدي|اقصد|اظن/.test(k);
  const information=/^(?:what\b|what's\b|how\b|can\b|does\b|do you\b|is\b|are\b|explain\b|define\b|يعني|ايه|اشرح|ما هو|ما هي|ازاي|هل)/.test(k)&&!personal;
  ex.messageKind=information?'information':personal||ex.owned||correction?'personal':'ambiguous';
  const hints=[];if(/migrat|move|moving|transfer|انقل|نقل|ترحيل/.test(k))hints.push(/domain|دومين|نطاق/.test(k)&&!/website|site|hosting|موقع|استضاف/.test(k)?'domainTransfer':'migration');
  if(/price|cost|how much|cheapest|budget|بكام|سعر|تكلف|ميزاني/.test(k))hints.push('pricing');
  if(/node|next\.?js|postgres|python|laravel|react|runtime|compatib|توافق/.test(k))hints.push('technicalCompatibility');
  if(/compar|difference|versus|\bvs\b|قارن|فرق/.test(k))hints.push('comparison');if(/explor|researching hosting|بستكشف|بشوف الخيارات/.test(k))hints.push('exploration');
  if(/human|agent|talk to|whatsapp|اكلم.*(?:حد|الدعم)|دعم بشري/.test(k))hints.push('human');
  ex.intentHints=[...new Set(hints)];
  if(information){ex.facts={};ex.clears=[];ex.removedRequirements=[];ex.ambiguities=[];ex.owned=false;ex.consult={...ex.consult,migration:false,explicit:false};return ex;}
  if(ex.hypothetical)return ex;
  const modeFor=before=>{
   const clause=before.replace(/\b(?:node|next|react|vue)\.js\b/g,value=>value.replace('.','')).split(/[;!?؟،]|\bbut\b|\bhowever\b|لكن/).pop();
   if(/(?:don't|do not) know|not sure|unknown|مش (?:عارف|متاكد)|لا اعرف/.test(clause))return 'unknown';
   const direct=/(?:\bnot|\bno|\bwithout|\bisn't|\bis not|\bdon't|\bdo not|\bdoesn't|\bdoes not|مش|مفيش|معنديش|مببيعش|لا استخدم)\s*(?:(?:an?|any|use|using|uses|run|running|need|want|require|have|accept|sell|online|بستخدم|باستخدم|محتاج|عايز|ببيع)\s+){0,6}$/.test(clause);
   const coordinated=/(?:don't|do not|doesn't|does not|without|not|مش|مفيش)[^;.!?]{0,70}\b(?:or|and)\s*(?:(?:accept|sell|use|run|need|online)\s*)*$/.test(clause)&&!/(?:\band|\bor)\s+(?:i|we)\s+(?:do|use|have|accept|need)/.test(clause);
   if(direct||coordinated)return false;
   if(/\b(?:think|may|might|maybe|probably|possibly)\b|اظن|اعتقد|غالبا|يمكن/.test(clause))return 'tentative';
   return true;
  };
  const techs=[['WordPress',/\bwordpress\b|وورد\s*بريس|ورد\s*بريس/g,'platform'],['WooCommerce',/\bwoocommerce\b|ووكومرس/g,'platform'],['Laravel',/\blaravel\b|لارافيل/g,'platform'],['Next.js',/\bnext\.?js\b/g,'platform'],['React',/\breact(?:\.js)?\b/g,'platform'],['HTML',/\b(?:static html|html)\b/g,'platform'],['Node.js',/\bnode\.?js\b/g,'runtime'],['PHP',/\bphp\b/g,'runtime'],['Python',/\bpython\b|بايثون/g,'runtime'],['mysql',/\bmysql\b/g,'database'],['mariadb',/\bmariadb\b/g,'database'],['postgresql',/\bpostgres(?:ql)?\b/g,'database']];
  const asserted=[],denied=[],uncertain=[];
  for(const [id,re,role]of techs){let last;for(const m of k.matchAll(re))last={id,role,polarity:modeFor(k.slice(Math.max(0,m.index-100),m.index)),index:m.index};if(!last)continue;if(last.polarity===false)denied.push(last);else if(last.polarity===true)asserted.push(last);else uncertain.push(last);}
  const personallySupplied=personal||ex.owned||!!flow.consultExpect||/\d+\s+(?:use|are|run)\s+wordpress/.test(k);
  if(personallySupplied){
   const declaredPlatforms=asserted.filter(t=>t.role==='platform');
   if(declaredPlatforms.length){const chosen=declaredPlatforms.find(t=>['Laravel','Next.js','React'].includes(t.id))||declaredPlatforms.find(t=>t.id==='WooCommerce')||declaredPlatforms[0];put('platform',chosen.id);put('platforms',declaredPlatforms.map(t=>t.id));ex.clears.push('platformCandidate','technologyCandidates','platformUnknown');if(['Laravel','Next.js','React'].includes(chosen.id))put('technicalReview',true);}
   else if(uncertain.some(t=>t.role==='platform'||t.id===f.platform?.value)||denied.some(t=>t.id===f.platform?.value))delete f.platform;
   for(const role of ['runtime','database']){const pos=asserted.filter(t=>t.role===role).sort((a,b)=>a.index-b.index);if(pos.length)put(role,pos[pos.length-1].id);else if(denied.some(t=>t.role===role)){delete f[role];if(denied.some(t=>t.id.toLowerCase()===String(profile[role]?.value).toLowerCase()))ex.clears.push(role);}if(uncertain.some(t=>t.role===role)&&!pos.length)delete f[role];}
   if(denied.length){put('deniedTechnologies',denied.map(t=>t.id==='postgresql'?'PostgreSQL':t.id));for(const t of denied){if(profile.platform?.value===t.id)ex.clears.push('platform');if(t.id==='Node.js'){ex.removedRequirements=[...(ex.removedRequirements||[]),'nodejs'];if(f.requirements)f.requirements.value=f.requirements.value.filter(id=>id!=='nodejs');}}
    if(f.platforms)f.platforms.value=f.platforms.value.filter(id=>!denied.some(t=>t.id===id));}
   const woo=[...asserted,...denied,...uncertain].find(t=>t.id==='WooCommerce');
   if(woo){put('isWooCommerce',woo.polarity===true?true:woo.polarity===false?false:'unknown',{certainty:woo.polarity===true||woo.polarity===false?'explicit':woo.polarity});if(woo.polarity===false){delete f.isEcommerce;if(profile.website?.value==='online_store'&&!/not.*(?:store|sell)|مش متجر|مببيعش/.test(k)){delete f.website;ex.clears=ex.clears.filter(id=>id!=='website');}}
    if(woo.polarity==='tentative'||woo.polarity==='unknown'){delete f.isEcommerce;delete f.platforms;if(f.website?.value==='online_store'&&!/store|متجر|ecommerce/.test(k))delete f.website;ex.clears=ex.clears.filter(id=>!['platform','platforms','website','products','isEcommerce'].includes(id));}}
   if(uncertain.length){if(f.platforms){f.platforms.value=f.platforms.value.filter(id=>!uncertain.some(t=>t.id===id));if(!f.platforms.value.length)delete f.platforms;}if(f.website?.value==='application'&&!/application|\bapp\b|تطبيق/.test(k))delete f.website;put('technologyCandidates',uncertain.map(t=>({value:t.id,certainty:t.polarity})),{certainty:'uncertain'});const candidate=uncertain.find(t=>t.role==='platform');if(candidate)put('platformCandidate',candidate.id,{certainty:candidate.polarity});ex.uncertainties=uncertain.map(t=>({value:t.id,certainty:t.polarity}));}
  }
  // Coordinated negative verbs apply to each explicit feature; a technology denial alone does not rule out commerce.
  for(const [id,re]of [['isEcommerce',/\bsell (?:products|anything)|\bonline store\b|\becommerce\b|متجر|مببيعش منتجات/g],['acceptsPayments',/\b(?:accept )?(?:online )?payments?\b|دفع(?: اونلاين)?/g],['subscriptions',/\bsubscriptions?\b|اشتراكات/g]]){
   let polarity;for(const m of k.matchAll(re))polarity=modeFor(k.slice(Math.max(0,m.index-100),m.index));if(/مببيعش|مش ببيع/.test(k)&&id==='isEcommerce')polarity=false;if(/مفيش.*دفع/.test(k)&&id==='acceptsPayments')polarity=false;
   if(polarity===false)put(id,false);else if(polarity===true&&(personal||ex.owned))put(id,true);
  }
  if(/(?:company|business) website.*(?:not|isn't|is not) (?:a )?(?:woocommerce )?(?:online )?store/.test(k)){put('website','business');put('isEcommerce',false);}if(f.isEcommerce?.value===false){if(f.website?.value==='online_store')delete f.website;if(profile.website?.value==='online_store')ex.clears.push('website');}
  if(correction&&f.platform&&profile.platform?.value!==f.platform.value)ex.clears.push('platforms','platformCandidate','technologyCandidates');
  const countTerms=[['websites','(?:websites?|sites?|مواقع|موقع)'],['products','(?:products?|منتج(?:ات)?)'],['emailAccounts','(?:(?:business )?emails?|email accounts?|mailboxes|ايميل(?:ات)?|بريد)'],['orders','(?:orders?|طلبات|طلب)'],['wordpressWebsites','(?:(?:are|use|run) )?wordpress(?: websites?| sites?)?'],['woocommerceWebsites','(?:(?:are|use|run) )?woocommerce(?: stores?| websites?)?']];
  const text=L.arabicNumbers(k).replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/g,n=>({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12}[n]));
  if(personallySupplied||correction||/^(?:\d+\s+(?:use|are|run))/.test(text)){for(const [id,term]of countTerms){for(const m of text.matchAll(new RegExp('(\\d[\\d,]*(?:\\.\\d+)?)\\s*(?:و)?\\s*'+term,'g'))){if(modeFor(text.slice(Math.max(0,m.index-60),m.index))===false)continue;const n=number(m[1]);if(n!==null)put(id,n,id==='orders'?{period:/day|daily|يوم/.test(text)?'day':profile.orders?.period||null}:{});}}}
  const metricNames=['websites','traffic','products','orders','emailAccounts','budget'];
  const explicitlyNamed=/websites?|sites?|مواقع|موقع|visits?|visitors?|traffic|زيار|products?|منتج|orders?|طلبات|emails?|mailboxes|ايميل|budget|ميزاني|[$€£]|usd|دولار/.test(k);
  if(correction&&!explicitlyNamed){const numbers=[...k.matchAll(/\d+(?:\.\d+)?/g)];const key=f.budget?'budget':flow.lastNumericSlot||Object.keys(profile).filter(id=>metricNames.includes(id)).slice(-1)[0];if(numbers.length===1&&metricNames.includes(key)&&profile[key]){for(const id of metricNames)if(id!==key)delete f[id];f[key]={...profile[key],value:Number(numbers[0][0]),source:'customer correction',certainty:'explicit'};ex.lastNumericSlot=key;ex.ambiguities=[];}else if(!Object.keys(f).length&&/actually|meant|correction|instead|forget that|قصدي|اقصد|مش ده|غيرت رايي/.test(k))ex.ambiguousCorrection=true;}
  const requested=[],excluded=[];for(const [id,re]of [['shared',/\bshared\b|مشترك/g],['wordpress',/\bwordpress hosting\b/g],['cloud',/\bcloud\b|كلاود|سحابي/g],['reseller',/\breseller\b|ريسيلر/g]]){for(const m of k.matchAll(re)){const before=k.slice(Math.max(0,m.index-65),m.index);if(!/want|need|عايز|محتاج|recommend/.test(before))continue;if(modeFor(before)===false)excluded.push(id);else if(modeFor(before)===true)requested.push(id);}}
  if(excluded.length)put('excludedCategories',[...new Set(excluded)]);if(requested.length)put('requestedCategory',requested[requested.length-1]);
  if(personallySupplied){const priorities=[['performance',/speed|performance|سرع|اداء/],['price',/affordable|low cost|رخيص|سعر مناسب/],['reliability',/reliab|uptime|استقرار/],['security',/secur|امان/],['support',/(?:technical support|hosting support|support.*(?:important|priority)|دعم.*(?:اهم|اولويه))/],['scalability',/scalab|grow|توسع/]].filter(([,re])=>re.test(k)&&/priorit|important|matter|need|want|اهم|عايز|محتاج/.test(k)).map(([id])=>id);if(priorities.length)put('priorities',priorities);}
  // Email addresses and technology names are not website addresses. Retain real HTTP URLs without query/fragment.
  delete f.domain;delete f.websiteUrl;const addressText=s.replace(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,' ');
  const hostValid=d=>d.length<=253&&d.split('.').every(part=>part.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(part))&&/\.[a-z]{2,63}$/i.test(d);
  const candidates=[...addressText.matchAll(/(?:https?:\/\/)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})(?::\d{1,5})?(\/[^\s?#]*)?/gi)];
  for(const m of candidates){const host=m[1];if(/[a-z0-9@_.-]/i.test(addressText[m.index-1]||'')||!hostValid(host)||/^(?:next|node|react|vue)\.js$/i.test(host)&&!/^https?:\/\//.test(m[0])||/[@]/.test(addressText[m.index-1]||''))continue;if(personallySupplied||flow.consultExpect==='domain'||/domain|دومين|نطاق/.test(s)){put('domain',host);if(/^https?:\/\//.test(m[0]))put('websiteUrl',m[0].split(/[?#]/)[0].replace(/[.,)]+$/,''));break;}}
  const metricExpressions={websites:/\d+\s*(?:websites?|sites?|مواقع|موقع)/g,traffic:/\d[\d,.]*\s*(?:monthly\s*)?(?:visitors?|visits?|زيار|زوار)/g,products:/\d+\s*(?:products?|منتج)/g,orders:/\d+\s*(?:orders?|طلبات|طلب)/g,emailAccounts:/\d+\s*(?:business\s*)?(?:emails?|mailboxes|ايميل)/g,budget:/[$€£]\s*\d[\d,.]*|\d[\d,.]*\s*(?:usd|dollars?|دولار)|(?:budget|ميزاني)\D{0,25}\d[\d,.]*/g};
  let lastPosition=-1;for(const [id,re]of Object.entries(metricExpressions))if(f[id])for(const m of k.matchAll(re)){if(m.index>lastPosition){lastPosition=m.index;ex.lastNumericSlot=id;}}
  ex.clears=[...new Set(ex.clears)];return ex;
 }

 function EscapePositive(s,term){return s.replace(new RegExp(term,'g'),'');}

 root.iHolyTechAssistantEntities=Object.freeze({extract,number,positive});
})(typeof window!=='undefined'?window:globalThis);
