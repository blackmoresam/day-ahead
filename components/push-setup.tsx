"use client";
import {useEffect,useState} from 'react';
import {Smartphone} from 'lucide-react';
import {Button} from '@/components/ui/button';

function decodeKey(value:string){
  const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
  return Uint8Array.from(raw,character=>character.charCodeAt(0));
}

export default function PushSetup(){
  const [supported,setSupported]=useState<boolean|null>(null);
  const [publicKey,setPublicKey]=useState('');
  const [subscription,setSubscription]=useState<PushSubscription|null>(null);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState('');
  const [needsSignIn,setNeedsSignIn]=useState(false);

  useEffect(()=>{
    let active=true;
    const possible='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
    setSupported(possible);
    if(!possible)return;
    Promise.all([fetch('/api/push').then(r=>r.json() as Promise<{publicKey?:string}>),navigator.serviceWorker.register('/sw.js').then(reg=>reg.pushManager.getSubscription())])
      .then(async([config,current])=>{
        if(current){
          const saved=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(current)});
          if(!saved.ok){if(active){setMessage('Sign in to Day Ahead to finish connecting this phone.');setNeedsSignIn(saved.status===401)}return}
        }
        if(active){setPublicKey(config.publicKey||'');setSubscription(current)}
      })
      .catch(()=>active&&setMessage('Could not check notification setup. Try refreshing.'));
    return()=>{active=false};
  },[]);

  async function enable(){
    setWorking(true);setMessage('');
    try{
      if(!publicKey)throw Error('Push delivery is not configured yet.');
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw Error('Allow notifications for Day Ahead in your iPhone settings, then try again.');
      const registration=await navigator.serviceWorker.ready;
      const current=await registration.pushManager.getSubscription();
      const next=current||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)});
      const response=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
      if(!response.ok){if(!current)await next.unsubscribe();const body=await response.json().catch(()=>({})) as {error?:string};setNeedsSignIn(response.status===401);throw Error(body.error||'Could not save this phone.');}
      setSubscription(next);setMessage('Enabled. Tap “Send a test” to check delivery.');
    }catch(error){setMessage(error instanceof Error?error.message:'Could not enable notifications.')}
    finally{setWorking(false)}
  }

  async function disable(){
    if(!subscription)return;
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/push',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});
      if(!response.ok)throw Error('Could not remove this phone from delivery.');
      await subscription.unsubscribe();setSubscription(null);setMessage('Notifications turned off for this phone.');
    }catch(error){setMessage(error instanceof Error?error.message:'Could not turn notifications off.')}
    finally{setWorking(false)}
  }

  async function test(){
    if(!subscription)return;
    setWorking(true);setMessage('Sending a test notification…');
    try{
      const response=await fetch('/api/push/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});
      const body=await response.json() as {error?:string};
      if(!response.ok)throw Error(body.error||'Test failed.');
      setMessage('Test sent. Check your iPhone notifications.');
    }catch(error){setMessage(error instanceof Error?error.message:'Test failed.')}
    finally{setWorking(false)}
  }

  const status=subscription?'iPhone push: enabled':supported===false?'iPhone push: open from Home Screen':publicKey?'iPhone push: ready to enable':'iPhone push: setup needed';
  return <div className="push-setup">
    <div className="push-state"><Smartphone/><div><strong>{status}</strong><p>{subscription?'Evening check-in scheduled for 20:00 London time.':supported===false?'Open the installed Day Ahead icon on your iPhone to enable web push.':'Tap Enable on your iPhone to allow the 20:00 check-in.'}</p></div></div>
    {supported&&publicKey&&<div className="push-actions">{subscription?<><Button variant="outline" disabled={working} onClick={test}>Send a test</Button><Button variant="outline" disabled={working} onClick={disable}>Turn off</Button></>:<Button variant="outline" disabled={working} onClick={enable}>Enable 20:00 push</Button>}</div>}
    {message&&<p className="push-message" role="status">{message}</p>}
    {needsSignIn&&<a className="push-signin" href="/signin-with-chatgpt?return_to=%2F">Sign in to finish setup</a>}
  </div>
}
