import { z } from "zod";

export interface ApiHousehold {
    name:string;
    id:string;
    members:{userid:string, firstname:string, lastname:string}[];
}

export interface ApiUser {
    first_name:string;
    last_name:string;
    id:string;
    household:ApiHousehold|null;
    task:any;
}