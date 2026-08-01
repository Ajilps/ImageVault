export function asyncHandler(handler) {
    return (request, response, next) => {
        void handler(request, response, next).catch(next);
    };
}
