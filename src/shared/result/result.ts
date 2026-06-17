
interface Success<T> {
    success: true;
    data: T
}

interface Failure<ErrorCode extends string> {
    success: false;
    errorMessage: string;
    errorCode: ErrorCode;
}

export type TResult<TData = never, TError extends string = never> = Success<TData> | Failure<TError>;

export const Result = {
    success: <T>(data: T): TResult<T> => ({
        data: data,
        success: true
    }),
    failure: <ErrorCode extends string>(errorCode: ErrorCode, errorMessage: string): TResult<never, ErrorCode> => ({
        errorCode: errorCode,
        errorMessage: errorMessage,
        success: false
    })
}