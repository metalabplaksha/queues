/*
var ds = new DaveService("https://test.iamdave.ai", "fashion_fitting", {....});
ds.list("measurement", {"_sort_by": "priority", "measurement": "hips"}, function(data){}, function(e){});
ds.get("measurement", "<id>", function(data){}, function(e){});
ds.post("measurement", {....}, function(data){}, function(e){});
ds.update("measurement","<id>" ,{....}, function(data){}, function(e){});
ds.remove("measurement","<id>", function(data){}, function(e){});
ds.signup({}, function(data){}, function(e){})
*/


/*
 * @description Service class for accessing the dave api's
 * @example var ds = new DaveService("https://test.iamdave,ai", "dave_test",{"signup_key": "<SIGNUP-API-KEY>"});
 */




class DaveService{
    logout(callback){
        deleteAllCookies();
        callback();
    }
    /*
     * @description Can authenticate using this static function, if on success will retrun DaveService object else returns error
     * @example DaveService.login("https://test.iamdave,ai", "dave_test", "john@dave_test.com", "123456")
     * @param {string} enterprise_id 
     * @param {string} user_id 
     * @param {string} password 
     * @returns if on success will retrun DaveService object else returns error
     */
    static login(host, enterprise_id, user_id, password, params){
        if(!enterprise_id || !user_id || !password){
            throw "Credentials missing";
        }
        var ds;
        var err;
        djq.ajax({
            url: host+"/login",
            method: "POST",
            dataType: "json",
            contentType: "json",
            headers:{
                "Content-Type":"application/json"
            },
            async: false,
            data: JSON.stringify({
                "enterprise_id": enterprise_id,
                "user_id": user_id,
                "password": password
            }),
            success: function(data) {
                console.debug("Logged in successfully :: ", data);
                params["user_id"] = data["user_id"];
                params["api_key"] = data["api_key"];
                ds = new DaveService(host, enterprise_id, params);
            },
            error: function(e) {
                console.log("Error While posting object :: ", e)
                err = e.responseJSON || e;
            }
        });
        if(ds){
            return ds;
        }else{
            throw err["error"] || err;
        }
    }

    /*
     * @description Service class for accessing the dave api's
     * @example var ds = new DaveService("https://test.iamdave,ai", "dave_test",{"signup_key": "<SIGNUP-API-KEY>"});
     * @param {string} host host url example - https://test.iamdave.ai
     * @param {string} enterprise_id 
     * @param {Object} settings extra perameters like user_id, signup_key, api_key
     */
    constructor(host,enterprise_id, settings){
        //super()
        this.authentication_cookie_key = settings["authentication_cookie_key"] || "authentication";
        this.headers =Utills.getCookie(this.authentication_cookie_key) || null;
        this.host = host;
        this.user_id_attr = settings["user_id_attr"] || "user_id";
        this.enterprise_id = enterprise_id;
        this.signp_key = settings["signup_apikey"];
        this.api_key = settings["api_key"];
        this.user_id = settings["user_id"];
        this.settings = settings;
        this.checkAuth();
    }
    checkAuth(){
        if (!this.enterprise_id)
            throw "'enterprise_id' is required"
        if (this.headers) {
            this.user_id = this.headers["X-I2CE-USER-ID"];
            this.api_key = this.headers["X-I2CE-API-KEY"];
        }
        if (!this.signp_key && (!this.user_id || !this.api_key)) {
            throw "signp_key or (user_id and api_key) are required";
        } else if (this.user_id && this.api_key) {
            this.headers = {
                "Content-Type": "application/json",
                "X-I2CE-ENTERPRISE-ID": this.enterprise_id,
                "X-I2CE-USER-ID": this.user_id,
                "X-I2CE-API-KEY": this.api_key,
                //"Access-Control-Allow-Origin": "*"               
            }
            Utills.setCookie(this.authentication_cookie_key, JSON.stringify(this.headers), 240);
            this.signin_required = false;
            console.debug("Signin required set as false :: got from cookies");
            
            var csm = this.settings["customer_model_name"] ||Utills.getCookie("customer_model_name");
            var prm = this.settings["product_model_name"] ||Utills.getCookie("product_model_name");
            var inm = this.settings["interaction_model_name"] ||Utills.getCookie("interaction_model_name");
            var that = this;
            if(!csm){
                this.getRaw("/models/core/name?model_type=customer", function(data){
                    that.customer_model_name = data[0];
                    Utills.setCookie("customer_model_name", data[0]);
                }, (err)=> console.error("unable to fetch customer model name", err), false)
            }else{
                Utills.setCookie("customer_model_name", csm, 240);
            }
            if(!prm){
                this.getRaw("/models/core/name?model_type=product", function(data){
                    that.product_model_name = data[0];
                    Utills.setCookie("product_model_name", data[0]);
                }, (err)=> console.error("unable to fetch product model name", err), false)
            }else{
                Utills.setCookie("product_model_name", prm, 240);
            }
            if(!inm){
                this.getRaw("/models/core/name?model_type=interaction", function(data){
                    that.interaction_model_name = data[0];
                    Utills.setCookie("interaction_model_name", data[0]);
                }, (err)=> console.error("unable to fetch intraction model name", err), false)
            }else{
                Utills.setCookie("interaction_model_name", inm, 240);
            }
        } else {
            this.signin_required = true;
        }
        Utills.setCookie("host", this.host, 240);

        
        return !this.signin_required;
    }
    /*
     * @description Create new object/row in the model/table
     * @example creating customer with name john, 26, m
     *  - ds.post({"name": "john", "age": 26, "gender": "m"}, function(data){...}, function(err){...})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {Object} data Json object keys represents the attribute/column names of the model/table 
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     *  - Success response:- Will return one parameter, will be a object {...} will have posted row/object 
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    post(model, data, successCallback, errorCallback, cors){
        if(this.signin_required){
            throw "Auth required";
            
        }
        var async = data["async"] || false;
        delete data["async"];
        var that = this;
        console.debug("Posting "+model+" object :: ", data );
        return this.postRaw("/object/" + model, data, successCallback, errorCallback, cors);
    }
    //"/transaction/sms"
    postRaw(url, data, successCallback, errorCallback, cors){
        if(this.signin_required){
            throw "Auth required";
            
        }
        var async = data["async"] == undefined ? true : data["async"];
        delete data["async"];
        var that = this;
        var headers = this.headers;
        if (cors == false) {
            // headers["Access-Control-Allow-Origin"] = "https://127.0.0.1:5500"

        //     // headers["Access-Control-Allow-Headers"] = "X-I2CE-USER-ID,X-I2CE-ENTERPRISE-ID,X-I2CE-API-KEY,X-I2CE-SIGNUP-API-KEY,Content-Type";

        }
        return djq.ajax({
            url: this.host + url,
            method: "POST",
            dataType: "json",
            contentType: "json",
            async: async,
            withCredentials: true,
            headers: headers,
            data: JSON.stringify(data),
            success: function(data) {
                console.debug("Posted object :: ", data);
                successCallback(data);
            },
            error: function (err) {
                err = err.responseJSON || err;
                console.log("Error While posting object :: ", err)
                errorCallback(err);
            }
        })
    }
    /*
     * @description Update existing object/row to the model/table
     * @example if you want to update phone number of a customer with id 1
     *  - ds.update(1, {"phone_number": <number>}, function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {*} object_id Id attibute value of the object you wanted to update...
     * @param {object} data Json object keys represents the attribute/column names of the model/table 
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback  Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     *  - Success response:- Will return one parameter, will be a object {...} will have updated row/object 
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    update(model, object_id, data, successCallback, errorCallback){
        if(this.signin_required){
            throw "Auth required";
            
        }
        var async = data["async"] || false;
        delete data["async"];

        var that = this;
        console.debug("Updating "+model+" object :: ", data );
        return djq.ajax({
            url: this.host + "/object/" + model + "/" + object_id,
            method: "PATCH",
            dataType: "json",
            contentType: "json",
            withCredentials: true,
            headers: this.headers,
            async: async,
            data: JSON.stringify(data),
            success: function(data) {
                console.debug("Updated object :: ", data);
                successCallback(data);
            },
            error: function (err, e) {
                err = err.responseJSON || err;
                console.log("Error While updating object :: ", err)
                errorCallback(err);
            }
        })
    }
    /*
     * @description Delete existing object/row to the model/table
     * @example To delete a customer with id 10
     * - ds.remove("customer", 10, function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {*} object_id Id attibute value of the object you wanted to delete...
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     *  - Success response:- Will return one parameter, will be a object {...} will have deleted row/object 
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    remove(model, object_id, successCallback, errorCallback){
        if(this.signin_required){
            throw "Auth required";
            
        }
        var async = false;
        // delete data["async"];
        var that = this;
        console.debug("Deleteing " + model + " object :: ", object_id);
        return djq.ajax({
            url: this.host + "/object/" + model + "/" + object_id,
            method: "DELETE",
            dataType: "json",
            contentType: "json",
            withCredentials: true,
            async: async,
            headers: this.headers,
            data: JSON.stringify({}),
            success: function (data) {
                console.debug("Deleted object :: ", data);
                successCallback(data);
            },
            error: function (err) {
                err = err.responseJSON || err;
                console.log("Error While deleting object :: ", err)
                errorCallback(err);
            }
        })
    }
    /*
     * @description Update existing object/row to the model/table
     * @example if you want to update phone number of a customer with id 1
     *  - ds.update(1, {"phone_number": <number>}, function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {*} object_id Id attibute value of the object you wanted to update...
     * @param {object} data Json object keys represents the attribute/column names of the model/table 
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback  Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     *  - Success response:- Will return one parameter, will be a object {...} will have updated row/object 
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    iupdate(model, object_id, data, successCallback, errorCallback){
        if(this.signin_required){
            throw "Auth required";
        }
        var async = data["async"] || false;
        delete data["async"];
        var that = this;
        console.debug("Updating "+model+" object :: ", data );
        return djq.ajax({
            url: this.host + "/iupdate/" + model + "/" + object_id,
            method: "PATCH",
            dataType: "json",
            contentType: "json",
            withCredentials: true,
            async: async,
            headers: this.headers,
            data: JSON.stringify(data),
            success: function(data) {
                console.debug("Updated object :: ", data);
                successCallback(data);
            },
            error: function (err, e) {
                err = err.responseJSON || err;
                console.log("Error While updating object :: ", err)
                errorCallback(err);
            }
        })
    }

    sendBeacon(url, data){
        if(this.signin_required){
            throw "Auth required";
            
        }
        data["_i2ce_user"] = {
            "enterprise_id": this.enterprise_id,
            "user_id": this.user_id,
            "api_key": this.api_key
        }
        navigator.sendBeacon(this.host + url, data);
    }

    /*
     * @description Get an existing object/row of model/table
     * @example To get a customer with id of 1
     *  - ds.get("customer", 1,function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {*} object_id Id attibute value of the object you wanted to get...
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     *  - Success response:- Will return one parameter, will be a object {...} will have row/object with specific object_id
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    get(model, object_id, successCallback, errorCallback){
        if(this.signin_required){
            throw "Auth required";            
        }
        var that = this;
        console.debug("Getting " + model + " object :: ", object_id);
        var url = "/object/" + model + "/" + object_id;
        return this.getRaw(url, successCallback, errorCallback);
    }
    getRaw(url, successCallback, errorCallback, async=true){
        if(this.signin_required){
            throw "Auth required";
            
        }
        var that = this;
        return djq.ajax({
            url: this.host + url,
            method: "GET",
            dataType: "json",
            contentType: "json",
            withCredentials: true,
            async: async != undefined ? async : true,
            headers: this.headers,
            success: function (data) {
                console.debug("Got object :: ", data);
                successCallback(data);
            },
            error: function (err) {
                err = err.responseJSON || err;
                console.log("Error While getting object :: ", err)
                errorCallback(err);
            }
        })
    }
    /*
     * @description Get list of attributes of a model/table
     * @example To get a customer model/table attributes 
     *  - ds.getAttributes("customer",function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     *  - Success response:- Will return one parameter, will be a list if objects 
     *  //[
            {
                "required": false,
                "type": "name",
                "id": false,
                "name": "name"
            },
            {
                "required": false,
                "type": "mobile_number",
                "name": "phone_number"
            },
            ....
        ]
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    getAttributes(model, successCallback, errorCallback){
        if(this.signin_required){
            throw "Auth required";
            
        }
        var that = this;
        console.debug("Getting " + model + " attributes");
        return djq.ajax({
            url: this.host + "/attriutes/" + model,
            method: "GET",
            dataType: "json",
            contentType: "json",
            withCredentials: true,
            headers: this.headers,
            success: function (data) {
                console.debug("Got attributes :: ", data);
                successCallback(data);
            },
            error: function (err) {
                err = err.responseJSON || err;
                console.log("Error While getting attributes :: ", err)
                errorCallback(err);
            }
        })
    }
    /*
     * @description Get structure of a model/table
     * @example To get a customer model/table attributes
     *  - ds.getModel("customer",function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     *  - Success response:- Will return one parameter, will be a list if objects 
     * //{
            "name": "person"
            "attributes": [
            {
                "required": false,
                "type": "name",
                "id": false,
                "name": "name"
            },
            {
                "required": false,
                "type": "mobile_number",
                "name": "phone_number"
            },
            ....
        ],
        ....
    }
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
     getModel(model, successCallback, errorCallback) {
        if(this.signin_required){
            throw "Auth required";
            
        }
        var that = this;
        console.debug("Getting " + model + " model");
        return djq.ajax({
            url: this.host + "/model/" + model,
            method: "GET",
            dataType: "json",
            contentType: "json",
            withCredentials: true,
            headers: this.headers,
            success: function (data) {
                console.debug("Got model :: ", data);
                successCallback(data);
            },
            error: function (err) {
                err = err.responseJSON || err;
                console.log("Error While getting model :: ", err)
                errorCallback(err);
            }
        })
    }
    
    /*
     * @description List or filter objects/rows of model/table
     * @example To get list of customers with age 26
     *  - ds.list("customer", {"age": 26},function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {object} filter_attributes  Filter attributes
     * 
     * Example: 
     * 
     * - To list employees by a single value
     * -- ds.list("customer", {"role": "Developer"},function(data){}, function(err){})
     * 
     * - To list employees by a multiple value
     * -- ds.list("customer", {"role": ["Developer", "Programmer"]},function(data){}, function(err){})
     * 
     * - To list employees between two values
     * -- ds.list("customer", {"age": "23,28"},function(data){}, function(err){})
     * 
     * - To list employees grater than a value
     * -- ds.list("customer", {"age": "23,"},function(data){}, function(err){})
     * 
     * -To list employees less than a value
     * -- ds.list("customer", {"age": ",30"},function(data){}, function(err){})
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     * - Success response:- Will return one parameter, will have the following keys
     * -- <br>`is_first` - is first page or not true/false 
     * -- <br>`is_last` - is last page or not true/false
     * -- <br>`page_size` - Size of the current page
     * -- <br>`total_number` - Total number of objects/rows in the model/table
     * -- <br>`page_number` - Current page number
     * -- <br>`data` - list of objects
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    list(model, filter_attributes, successCallback, errorCallback){
        if(this.signin_required){
            throw "Auth required";
        }
        var that = this;
        console.debug("Getting "+model+" objects :: ", filter_attributes);
        return djq.ajax({
            url: this.host + "/objects/" + model,
            method: "GET",
            dataType: "json",
            contentType: "json",
            data: filter_attributes,
            withCredentials: true,
            headers: this.headers,
            success: function (data) {
                console.debug("Got objects :: ", data);
                successCallback(data);
            },
            error: function (err) {
                err = err.responseJSON || err;
                console.log("Error While getting objects :: ", err)
                errorCallback(err);
            }
        })
    }
    /*
     * @description Pivot columns over all objects/rows of model/table
     * @example To get pivot of customers with 
     *  - ds.list("customer", {"age": 26},function(data){}, function(err){})
     * @param {string} model Model/Table name example: person, customer, product..etc
     * @param {object} filter_attributes  Filter attributes
     * 
     * Example: 
     * 
     * - To list employees by a single value
     * -- ds.list("customer", {"role": "Developer"},function(data){}, function(err){})
     * 
     * - To list employees by a multiple value
     * -- ds.list("customer", {"role": ["Developer", "Programmer"]},function(data){}, function(err){})
     * 
     * - To list employees between two values
     * -- ds.list("customer", {"age": "23,28"},function(data){}, function(err){})
     * 
     * - To list employees grater than a value
     * -- ds.list("customer", {"age": "23,"},function(data){}, function(err){})
     * 
     * -To list employees less than a value
     * -- ds.list("customer", {"age": ",30"},function(data){}, function(err){})
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns Returns through callback functions,
     * - Success response:- Will return one parameter, will have the following keys
     * -- <br>`is_first` - is first page or not true/false 
     * -- <br>`is_last` - is last page or not true/false
     * -- <br>`page_size` - Size of the current page
     * -- <br>`total_number` - Total number of objects/rows in the model/table
     * -- <br>`page_number` - Current page number
     * -- <br>`data` - list of objects
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    pivot(model, pivot_attributes, params, successCallback, errorCallback){
        if(this.signin_required){
            throw "Auth required";
        }
        var that = this;
        console.debug("Getting "+model+" objects :: ", pivot_attributes, params);
        var att = "";
        if(pivot_attributes && pivot_attributes.length){
             att = "/"+ pivot_attributes.join("/")
        }
        return djq.ajax({
            url: this.host + "/pivot/" + model + att,
            method: "GET",
            dataType: "json",
            contentType: "json",
            data: params,
            withCredentials: true,
            headers: this.headers,
            success: function (data) {
                console.debug("Got objects :: ", data);
                successCallback(data);
            },
            error: function (err) {
                err = err.responseJSON || err;
                console.log("Error While getting objects :: ", err)
                errorCallback(err);
            }
        })
    }

    /*
     * @description Upload file Like image(png, jpg, jpeg, bmp..), video(mp4, mkv...)..etc 
     * @example To upload image
     * file = <file refrence> 
     * ds.upload_file(file, "johns-profile.jpg", function(data){}, function(err){})
     * @param {File} file File to upload
     * @param {string} name Name of the file 
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api
     * @returns returns through callback function
     *  - Success response:- Will return one parameter, will have uploaded file details 
     * //{
            "path": "<real path of the uploaded in the project>",
            "full_path": "<full static file path of the file can access outside the project>",
            ...
        }
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    upload_file(file, name, successCallback, errorCallback) {
        var formData = new FormData();
        formData.append('file', file, name);
        console.debug("uploading file :: ", name);
        return djq.ajax({
            url: this.host + "/upload_file?large_file=true&full_path=true",
            type: "POST",
            dataType: "json",
            contentType: false,
            processData: false,
            headers:{
                "X-I2CE-ENTERPRISE-ID": this.enterprise_id,
                "X-I2CE-USER-ID": this.user_id,
                "X-I2CE-API-KEY": this.api_key
            },
            data:formData
        }).done(function(data) {
            if (data) {
                successCallback(data);
            }
            console.debug("uploaded file :: ", name);
        }).fail(function(err) {
            err = err.responseJSON || err;
            if (errorCallback) {
                errorCallback(err)
            }
            console.log("Error while uploading :: ", name, err);
        });
    }
    /*
     * @description To create dynamic login for customer/visitor data will be posted to customer type model/table Example: customer, visitor, person...etc
     * @param {object} data 
     * @param {requestCallback} successCallback Callback function, returnts the response from the api call
     * @param {requestCallback} errorCallback Callback function, returnts the error details from the api 
     * @returns returns through callback functions
     *  - Success response:- Will return one parameter, will be a customer type object {...} will have posted row/object
     *  - Error response:- Will return one parameter, will be a object {"error": <error message>}
     */
    signup(data, successCallback, errorCallback){
        var HEADERS;
        var signupurl = this.host+"/customer-signup";
        var datao = {
            "validated": true
        }
        if(data)
            djq.extend(datao, data)
        var that = this;
        if(this.settings["signup_model"]){
            signupurl = `${signupurl}/${this.settings["signup_model"]}`
        }
        return djq.ajax({
            url: signupurl,
            method: "POST",
            dataType: "json",
            contentType: "json",
            withCredentials: true,
            headers: {
                "Content-Type": "application/json",
                "X-I2CE-ENTERPRISE-ID": this.enterprise_id,
                "X-I2CE-SIGNUP-API-KEY": this.signp_key
            },
            data: JSON.stringify(datao),
            success: function(data) {
                HEADERS = {
                    "Content-Type": "application/json",
                    "X-I2CE-ENTERPRISE-ID": that.enterprise_id,
                    "X-I2CE-USER-ID": data[that.user_id_attr],
                    "X-I2CE-API-KEY": data.api_key
                }
                that.headers = HEADERS;
                Utills.setCookie(that.authentication_cookie_key, JSON.stringify(HEADERS), 24);
                that.user_id = data[that.user_id_attr];
                that.api_key = data.api_key;
                that.signin_required = false;
            },
            error: function (r) {
                console.log(r.responseJSON || r)
                errorCallback(r.responseJSON || r);
            }
        }).done(function (data) {
            // console.log(data)
            HEADERS = {
                "Content-Type": "application/json",
                "X-I2CE-ENTERPRISE-ID": that.enterprise_id,
                "X-I2CE-USER-ID": data[that.user_id_attr],
                "X-I2CE-API-KEY": data.api_key
            }
            that.headers = HEADERS;
            Utills.setCookie(that.authentication_cookie_key, JSON.stringify(HEADERS), 240);
            successCallback(data);
            that.headers = HEADERS;
        });
    }

    
}