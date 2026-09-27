import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const PORT = process.env.PORT || 8787

async function callAI(messages, temperature = 0.4) {
  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
  if (!key || key === 'put-your-key-here') return null

  // Gemini direct REST API. Only the API key is required.
  const model = process.env.GEMINI_MODEL || process.env.AI_MODEL || 'gemini-2.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')

  const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json'
      }
    })
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error?.message || `Gemini API returned ${response.status}`
    throw new Error(message)
  }

  const content = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('')
  if (!content) throw new Error('Gemini returned no content')

  // Gemini normally returns valid JSON because responseMimeType is set above.
  // Strip accidental markdown fences just in case.
  const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}

const bank = {
  grammar: [
    { type:'mcq', prompt:'Choose the grammatically correct sentence.', options:['The team have completed the report.','The team has completed the report.','The team are completed the report.','The team completing the report.'], answer:1, explanation:'Team is treated as a singular unit in standard business English.' },
    { type:'mcq', prompt:'By the time the client arrived, we ___ the presentation.', options:['finish','have finished','had finished','are finishing'], answer:2, explanation:'Past perfect describes an action completed before another past event.' },
    { type:'mcq', prompt:'Please send me ___ updated version of the proposal.', options:['a','an','the','no article'], answer:2, explanation:'The specific updated version is known from context.' },
    { type:'mcq', prompt:'We have been working on this project ___ three months.', options:['since','for','from','during'], answer:1, explanation:'For is used with a duration.' },
    { type:'mcq', prompt:'Neither the manager nor the developers ___ available right now.', options:['is','was','are','has'], answer:2, explanation:'With neither/nor, the verb generally agrees with the nearer subject, developers.' },
    { type:'mcq', prompt:'The new process will ___ the number of manual errors.', options:['affect','effect','affects','effects'], answer:0, explanation:'Affect is the verb meaning to influence.' },
    { type:'mcq', prompt:'We need ___ information before making a decision.', options:['many','a few','more','several'], answer:2, explanation:'Information is uncountable; more is appropriate.' },
    { type:'mcq', prompt:'If the server goes down, the support team ___ the incident immediately.', options:['would handle','will handle','handled','has handled'], answer:1, explanation:'First conditional uses present simple in the if-clause and will + verb in the result.' },
    { type:'mcq', prompt:'Choose the sentence with correct parallel structure.', options:['The role requires planning, coding and to test.','The role requires planning, coding and testing.','The role requires to plan, coding and testing.','The role requires planning, to code and testing.'], answer:1, explanation:'The list uses matching -ing forms.' },
    { type:'mcq', prompt:'The documents ___ by the compliance team yesterday.', options:['reviewed','were reviewed','are reviewing','have review'], answer:1, explanation:'Passive voice is required because the documents receive the action.' }
  ],
  situational: [
    { type:'mcq', prompt:'Your manager says a report has several errors and asks you to review it before a client meeting. What is the most professional response?', options:['It is not my fault because someone else provided the data.','I will review it, correct the errors and share the updated version before the meeting.','The report is already submitted, so nothing can be done.','You should have checked it before sending it.'], answer:1 },
    { type:'mcq', prompt:'A teammate misses a deadline and asks you to help finish the task. What should you do first?', options:['Tell the whole team that they are unreliable.','Ignore the request because it is not your task.','Clarify what remains, agree on priorities and help where practical.','Immediately report them to senior management.'], answer:2 },
    { type:'mcq', prompt:'A client asks for a feature that is outside the agreed scope. What is the best response?', options:['Promise it will be delivered tomorrow.','Refuse without explanation.','Acknowledge the request, explain the scope and discuss a change request or revised timeline.','Tell the client to speak to someone else.'], answer:2 },
    { type:'mcq', prompt:'You disagree with a colleague during a meeting. What is the most appropriate approach?', options:['Interrupt them repeatedly.','State your reasoning respectfully and suggest comparing the evidence.','Stay silent and complain later.','Tell them their idea is wrong.'], answer:1 },
    { type:'mcq', prompt:'You realize you may miss a project deadline. What should you do?', options:['Wait until the deadline passes.','Hide the issue and work silently.','Inform the relevant person early, explain the cause and propose a recovery plan.','Blame another team.'], answer:2 },
    { type:'mcq', prompt:'You receive an email with unclear requirements. What should you do?', options:['Guess and start immediately.','Ask concise clarification questions and confirm your understanding.','Forward it to everyone without context.','Ignore it until someone follows up.'], answer:1 }
  ],
  reading: [
    { type:'reading', passage:'The operations team introduced a new ticketing process in April. Requests are now classified as critical, high, medium or low priority. Critical incidents must be acknowledged within 15 minutes, while high-priority requests must be acknowledged within one hour. The change was introduced to make response times easier to track and to give managers clearer visibility into recurring issues.', prompt:'Why was the new process introduced?', options:['To reduce the number of employees','To make response times easier to track and improve visibility','To remove all low-priority requests','To eliminate managers'], answer:1 },
    { type:'reading', passage:'A project team planned to complete user testing on Monday. However, several test accounts were unavailable, so testing was moved to Wednesday. The development team used the extra time to fix two minor interface issues. The client presentation remains scheduled for Friday.', prompt:'When will user testing take place?', options:['Monday','Tuesday','Wednesday','Friday'], answer:2 },
    { type:'reading', passage:'The company introduced a learning allowance that employees can use for approved technical courses and professional certifications. Employees must submit a request before enrolling. Reimbursement is available after successful completion and submission of the required documents.', prompt:'What must employees do before enrolling?', options:['Complete the course','Submit a request','Receive reimbursement','Submit a presentation'], answer:1 },
    { type:'reading', passage:'During the quarterly review, the team found that most customer complaints were related to delayed responses rather than product defects. The team decided to revise its support workflow and introduce clearer escalation rules. Product development changes were not the immediate focus.', prompt:'What was the main source of customer complaints?', options:['Product defects','Delayed responses','Pricing','Training'], answer:1 }
  ],
  listening: [
    { type:'listening', script:'The client call has been moved from Tuesday morning to Wednesday at 2 PM. Please send the revised agenda to all participants by Tuesday evening.', prompt:'When is the client call?', options:['Tuesday morning','Tuesday evening','Wednesday at 2 PM','Thursday at 2 PM'], answer:2 },
    { type:'listening', script:'Priya will prepare the presentation slides, while Arjun will verify the sales figures. Both tasks should be completed before Thursday noon.', prompt:'Who will verify the sales figures?', options:['Priya','Arjun','The manager','The client'], answer:1 },
    { type:'listening', script:'The training session is optional for employees who completed the previous module, but it is mandatory for new team members. The session starts at 10 AM in Conference Room B.', prompt:'Who must attend the session?', options:['Only managers','Only previous participants','New team members','Clients'], answer:2 },
    { type:'listening', script:'The deployment will begin at 11 PM because customer traffic is expected to be lower at that time. The support team will monitor the system for two hours after deployment.', prompt:'Why will deployment begin at 11 PM?', options:['The team prefers night shifts','Customer traffic is expected to be lower','The client requested it','The system is unavailable during the day'], answer:1 }
  ],
  writing: [
    { type:'writing', prompt:'Write a professional email to your project manager requesting a one-day extension for a deliverable. Explain the reason briefly and propose a revised submission time.', minWords:70 },
    { type:'writing', prompt:'Write a professional email to a teammate asking for clarification about two requirements in a project specification. Keep the message concise and clearly state what you need.', minWords:70 }
  ],
  speaking: [
    { type:'speaking', prompt:'Describe a time when you had to work as part of a team. Explain your role, the challenge and how the team handled it.', minWords:100 },
    { type:'speaking', prompt:'Do you think effective communication is important for software engineers? Explain your view and give examples.', minWords:100 }
  ]
}

function genericFallback(section) {
  return bank[section] || []
}

app.get('/api/health', (_, res) => res.json({ ok:true, aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY) }))

app.post('/api/assessment/generate', async (req,res) => {
  const { mode='mock' } = req.body || {}
  if (mode !== 'ai') return res.json({ assessment: buildAssessment(), source:'local' })
  try {
    const result = await callAI([
      { role:'system', content:`You generate a complete generic workplace English proficiency assessment. Return ONLY valid JSON, with no markdown and no commentary.

Required top-level shape:
{"title":"string","durationMinutes":60,"sections":[...]}

Create exactly these sections and counts, in this exact order:
1) id=grammar, count=10. Each question: {type:"mcq",prompt,options:[4 strings],answer:0-3,explanation}. Test grammar/sentence correction across tense, subject-verb agreement, articles, prepositions, modals, pronouns, conditionals, parallelism, punctuation, vocabulary usage.
2) id=writing, count=2. Each: {type:"writing",prompt,minWords:70}. These must be professional business-email tasks.
3) id=situational, count=6. Each: {type:"mcq",prompt,options:[4 strings],answer:0-3,explanation}. Workplace scenarios involving managers, teammates, clients, deadlines, conflict, clarification, prioritization and professionalism.
4) id=reading, count=4. Each: {type:"reading",passage,prompt,options:[4 strings],answer:0-3,explanation}. Passages should be generic workplace/business/technology topics and 80-140 words.
5) id=listening, count=4. Each: {type:"listening",script,prompt,options:[4 strings],answer:0-3,explanation}. Scripts should be 45-90 words and contain concrete details such as dates, times, people, tasks, changes or reasons.
6) id=speaking, count=2. Each: {type:"speaking",prompt,minWords:100}. Prompts should be generic personal/workplace opinion or experience topics.

Rules: all questions must be original and different from common canned examples; generic only; no company names; balanced difficulty; no duplicate prompts; objective answers must be unambiguous; answer is the zero-based index. The assessment must contain exactly 28 questions total.` },
      { role:'user', content:`Generate a fresh assessment now. Use random variation seed ${Date.now()}-${Math.random()}. Make the questions substantially different from previous generations.` }
    ], .8)
    const assessment = normalizeAssessment(result)
    const counts = Object.fromEntries(assessment.sections.map(s=>[s.id,s.questions.length]))
    const valid = counts.grammar===10 && counts.writing===2 && counts.situational===6 && counts.reading===4 && counts.listening===4 && counts.speaking===2
    if (!valid) throw new Error(`Gemini returned invalid assessment counts: ${JSON.stringify(counts)}`)
    return res.json({ assessment, source:'gemini', model:process.env.GEMINI_MODEL || 'gemini-2.5-flash' })
  } catch (e) {
    return res.status(502).json({ error:'AI generation failed', detail:e.message })
  }
})

app.post('/api/evaluate', async (req,res) => {
  const { assessment, answers } = req.body || {}
  if (!assessment || !answers) return res.status(400).json({ error:'assessment and answers are required' })
  const objective = gradeObjective(assessment, answers)
  let ai = null
  try {
    ai = await callAI([{ role:'system', content:'You are a strict but fair workplace English evaluator. Return JSON only. Evaluate business emails and spoken responses for task completion, grammar, vocabulary, professional tone, organization and clarity. Give 0-100 scores, concise feedback, strengths and improvements. Do not assess accent or infer personality.' }, { role:'user', content: JSON.stringify({ writing: assessment.writing?.map((q,i)=>({prompt:q.prompt,answer:answers[`writing-${i}`]||''})), speaking: assessment.speaking?.map((q,i)=>({prompt:q.prompt,answer:answers[`speaking-${i}`]||'', transcript:answers[`speaking-${i}-transcript`]||''})) }) }], .2)
  } catch { /* local score remains available */ }
  const subjective = localSubjective(assessment, answers)
  res.json({ objective, subjective, ai })
})

function buildAssessment(){
  return {
    title:'Workplace English Proficiency Mock',
    durationMinutes:60,
    sections:[
      {id:'grammar',title:'Grammar & Sentence Correction',count:10,questions:shuffle(bank.grammar).slice(0,10)},
      {id:'writing',title:'Business Communication Writing',count:2,questions:shuffle(bank.writing).slice(0,2)},
      {id:'situational',title:'Situational Awareness & Response',count:6,questions:shuffle(bank.situational).slice(0,6)},
      {id:'reading',title:'Reading Comprehension',count:4,questions:shuffle(bank.reading).slice(0,4)},
      {id:'listening',title:'Listening Comprehension',count:4,questions:shuffle(bank.listening).slice(0,4)},
      {id:'speaking',title:'Spoken Communication Simulation',count:2,questions:shuffle(bank.speaking).slice(0,2)}
    ]
  }
}
function shuffle(arr){ return [...arr].sort(()=>Math.random()-.5) }
function normalizeAssessment(a){
  const fallback=buildAssessment()
  if (!a || typeof a !== 'object' || !Array.isArray(a.sections)) throw new Error('Gemini returned an invalid JSON assessment')
  const byId = new Map(a.sections.map(s=>[s.id,s]))
  const sections = fallback.sections.map(s=>{
    const incoming=byId.get(s.id)
    if (!incoming || !Array.isArray(incoming.questions)) throw new Error(`Missing section: ${s.id}`)
    const questions=incoming.questions
    questions.forEach((q,i)=>{
      if (!q || typeof q.prompt !== 'string') throw new Error(`Invalid question in ${s.id} #${i+1}`)
      if (['grammar','situational','reading','listening'].includes(s.id)) {
        if (!Array.isArray(q.options) || q.options.length!==4 || !Number.isInteger(Number(q.answer)) || Number(q.answer)<0 || Number(q.answer)>3) throw new Error(`Invalid MCQ in ${s.id} #${i+1}`)
      }
      if (s.id==='writing' && !q.minWords) q.minWords=70
      if (s.id==='speaking' && !q.minWords) q.minWords=100
      if (s.id==='listening' && typeof q.script!=='string') throw new Error(`Missing listening script in #${i+1}`)
      if (s.id==='reading' && typeof q.passage!=='string') throw new Error(`Missing reading passage in #${i+1}`)
    })
    return {id:s.id,title:s.title,count:s.count,questions}
  })
  return { title:a.title||'Workplace English Proficiency Mock',durationMinutes:60,sections }
}
function gradeObjective(assessment, answers){
  let correct=0,total=0
  const bySection={}
  for(const section of assessment.sections){
    if(['writing','speaking'].includes(section.id)) continue
    let c=0
    section.questions.forEach((q,i)=>{ total++; if(Number(answers[`${section.id}-${i}`])===Number(q.answer)){correct++;c++} })
    bySection[section.id]={correct:c,total:section.questions.length,percent:Math.round(c/section.questions.length*100)}
  }
  return {correct,total,percent: total?Math.round(correct/total*100):0,bySection}
}
function wordCount(s=''){ return s.trim()?s.trim().split(/\s+/).length:0 }
function localSubjective(assessment,answers){
  const writing=assessment.sections.find(s=>s.id==='writing')?.questions||[]
  const speaking=assessment.sections.find(s=>s.id==='speaking')?.questions||[]
  const items=[]
  writing.forEach((q,i)=>{const text=answers[`writing-${i}`]||'';const words=wordCount(text);items.push({type:'writing',index:i,words,score:Math.min(100,Math.round((words>=q.minWords?70:45)+(text.includes('@')?0:5)+(text.length>180?15:5))),feedback:words>=q.minWords?'Length requirement met.':'Add more detail to reach the minimum word target.'})})
  speaking.forEach((q,i)=>{const t=answers[`speaking-${i}-transcript`]||answers[`speaking-${i}`]||'';const words=wordCount(t);items.push({type:'speaking',index:i,words,score:Math.min(100,Math.round((words>=100?70:45)+(words>150?15:5)+(t.length>300?10:0))),feedback:words>=100?'100-word target met.':'Keep speaking until you reach at least 100 words.'})})
  const avg=items.length?Math.round(items.reduce((a,b)=>a+b.score,0)/items.length):0
  return {items,average:avg}
}

app.listen(PORT,()=>console.log(`Server running on http://localhost:${PORT}`))
