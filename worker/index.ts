import handler from 'vinext/server/fetch-handler';
import {sendScheduledPush,type PushEnv} from '../lib/push';

// Cloudflare production workflow verified
export default {
  fetch(request:Request,env:PushEnv,ctx:ExecutionContext){return handler.fetch(request,env,ctx)},
  scheduled(controller:ScheduledController,env:PushEnv,ctx:ExecutionContext){ctx.waitUntil(sendScheduledPush(env,controller.scheduledTime))},
};
