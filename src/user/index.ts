export { GetUserEndpoint, GetUserRequest, GetUserResponse } from "./get";
export {
    CreateUserEndpoint,
    CreateUserRequest,
    CreateUserResponse,
} from "./create";
export {
    UpdateUserEndpoint,
    UpdateUserRequest,
    UpdateUserResponse,
} from "./update";
export {
    DeleteUserEndpoint,
    DeleteUserRequest,
    DeleteUserResponse,
} from "./delete";

import { GetUserEndpoint } from "./get";
import { CreateUserEndpoint } from "./create";
import { UpdateUserEndpoint } from "./update";
import { DeleteUserEndpoint } from "./delete";

export function userServiceEndpoints() {
    return [
        new GetUserEndpoint(),
        new CreateUserEndpoint(),
        new UpdateUserEndpoint(),
        new DeleteUserEndpoint(),
    ];
}
