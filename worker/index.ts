import handler from 'vinext/server/fetch-handler';
import {sendEveningPush,type PushEnv} from '../lib/push';

export default {
  fetch(request:Request,env:PushEnv,ctx:ExecutionContext){return handler.fetch(request,env,ctx)},
  scheduled(controller:ScheduledController,env:PushEnv,ctx:ExecutionContext){ctx.waitUntil(sendEveningPush(env,controller.scheduledTime))},
};
