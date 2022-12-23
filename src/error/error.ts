import { Types } from "../type/type";

export function _ERROR_TYPE_CALC(type1:Types,type2:Types){
    throw new Error(`CAN'T CALCULATE ${type1} and ${type2}`);
}