(async ()=>{
  const base = 'http://localhost:3001/api';
  const creds = { email: 'lecturer01@tdhuhu.edu.vn', password: '123123123Az!' };
  try{
    const loginRes = await (await fetch(base + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(creds) })).json();
    console.log('LOGIN', loginRes);
    const token = loginRes.accessToken;
    const coursesRes = await (await fetch(base + '/courses/my-courses', { headers: { Authorization: 'Bearer ' + token } })).json();
    console.log('MY_COURSES', coursesRes.length || Object.keys(coursesRes).length);
    const first = Array.isArray(coursesRes) ? coursesRes[0] : coursesRes[0];
    if(!first) return console.error('no course');
    const courseId = first.id || first.courseId || first._id;
    console.log('Using courseId=', courseId);
    const topics = await (await fetch(base + `/questions/metadata/topics?courseId=${courseId}`, { headers: { Authorization: 'Bearer ' + token } })).text();
    console.log('TOPICS_RESP:', topics);
    const qs = await (await fetch(base + `/questions?courseId=${courseId}`, { headers: { Authorization: 'Bearer ' + token } })).text();
    console.log('QUESTIONS_RESP:', qs);
  }catch(e){ console.error('ERR', e); process.exit(1); }
})();
