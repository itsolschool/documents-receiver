import { fluentProvide } from 'inversify-binding-decorators';

let provideSingleton = function(identifier) {
    return fluentProvide(identifier)
        .inSingletonScope()
        .done();
};

export default provideSingleton;
