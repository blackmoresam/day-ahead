self.addEventListener('push',event=>{
  let message={title:'Day Ahead',body:'Your evening check-in is ready.',url:'/'};
  try{if(event.data)message={...message,...JSON.parse(event.data.text())}}catch{}
  event.waitUntil(self.registration.showNotification(message.title,{body:message.body,tag:message.tag||'day-ahead',data:{url:message.url}}));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||'/',self.location.origin);
  if(url.origin!==self.location.origin)return;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===url.origin);
    if(existing){await existing.navigate(url.href);await existing.focus()}
    else await self.clients.openWindow(url.href);
  })());
});
