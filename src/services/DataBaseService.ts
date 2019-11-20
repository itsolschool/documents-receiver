import provideSingleton from '../ioc/provideSingletone';
import { DB_SERVICE } from '../constant/services';

@provideSingleton(DB_SERVICE)
export class DataBaseService {
    constructor() {}
}
