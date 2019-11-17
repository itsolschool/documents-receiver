import { ContextMessageUpdate, Middleware } from 'telegraf';
import User from '../models/User';

async function attachUser(ctx, next) {
    ctx.user = await User.query()
        .findById(ctx.from.id)
        .eager('team');
    await next();
}

export default attachUser as Middleware<ContextMessageUpdate>;
