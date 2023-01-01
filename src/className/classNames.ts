export class ClassNames{
    private _class_names:string[];
    private objects_class:{[name:string]:string};

    constructor(){
        this._class_names = [];
        this.objects_class = {};
    }

    public AddClassName(name:string){
        this._class_names.push(name);
    }

    public AddObject(object_name:string,class_name:string){
        let exist = false
        this._class_names.forEach(name=>{
            if(class_name == name) exist = true;
        })

        if(!exist) return null;

        this.objects_class[object_name] = class_name;
        console.log(this.objects_class,"!")
    }

    public ReturnClassNameOfObject(object_name:string){
        return this.objects_class[object_name];
    }

    public SearchClass(class_name:string){
        let result:string|null = null;
        this._class_names.forEach(name=>{
            if(class_name == name)result = name
        })
        
        return result
    }
}