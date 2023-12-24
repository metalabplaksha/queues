
class Utilities {
    static extendData(data, extend_object){
        extend_object = extend_object || {};
        data = data || {};
        let myPromise = new Promise(function(myResolve, myReject) {
            if(typeof extend_object == 'function'){
                var extend_data = extend_object(data);
                if(typeof extend_data == "object"){
                    myResolve(extend_data);
                }else{
                    myReject("Failed to extend object");
                }
            }else if(typeof extend_object == 'string'){
                var exd = {};
                try {
                    exd = JSON.parse(extend_object);
                    var d = {...data, ...exd}
                    myResolve(d);
                } catch (e) {
                    myReject(e);
                }
            }else{
                var d = {...data, ...extend_object}
                myResolve(d);
            }
        });
        return myPromise;
    }

    static makeid(length) {
        let result           = '';
        const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
    
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
    
        return result;
    }

    static getTime() {
        return (new Date()).getTime()/1000;
    }

    static _base64ToArrayBuffer(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    static encodeFlac(binData, recBuffers, isVerify, isUseOgg){
        var ui8_data = new Uint8Array(binData);
        var sample_rate=0,
            channels=0,
            bps=0,
            total_samples=0,
            block_align,
            position=0,
            recLength = 0,
            meta_data;

        function write_callback_fn(buffer, bytes, samples, current_frame){
            recBuffers.push(buffer);
            recLength += bytes;
            // recLength += buffer.byteLength;
        }

        function metadata_callback_fn(data){
            // console.info('meta data: ', data);
            meta_data = data;
        }


        var wav_parameters = wav_file_processing_read_parameters(ui8_data);	
        // convert the PCM-Data to the appropriate format for the libflac library methods (32-bit array of samples)
        // creates a new array (32-bit) and stores the 16-bit data of the wav-file as 32-bit data
        var buffer_i32 = wav_file_processing_convert_to32bitdata(ui8_data.buffer, wav_parameters.bps, wav_parameters.block_align);

        if(!buffer_i32){
            var msg = 'Unsupported WAV format';
            console.error(msg);
            return {error: msg, status: 1};
        }

        var tot_samples = 0;
        var compression_level = 5;
        var flac_ok = 1;
        var is_verify = isVerify;
        var is_write_ogg = isUseOgg;

        var flac_encoder = Flac.create_libflac_encoder(
            wav_parameters.sample_rate, 
            wav_parameters.channels, 
            wav_parameters.bps, 
            compression_level, 
            tot_samples, 
            is_verify
        );
        if (flac_encoder != 0){
            var init_status = Flac.init_encoder_stream(flac_encoder, write_callback_fn, metadata_callback_fn, is_write_ogg, 0);
            flac_ok &= init_status == 0;
            console.log("flac init: " + flac_ok);
        } else {
            Flac.FLAC__stream_encoder_delete(flac_encoder);
            var msg = 'Error initializing the decoder.';
            console.error(msg);
            return {error: msg, status: 1};
        }


        var isEndocdeInterleaved = true;
        var flac_return;
        if(isEndocdeInterleaved){		
            flac_return = Flac.FLAC__stream_encoder_process_interleaved(
                flac_encoder, 
                buffer_i32, buffer_i32.length / wav_parameters.channels
            );
        } else {	
            var ch = wav_parameters.channels;
            var len = buffer_i32.length;
            var channels = new Array(ch).fill(null).map(function(){ return new Uint32Array(len/ch)});
            for(var i=0; i < len; i+=ch){
                for(var j=0; j < ch; ++j){
                    channels[j][i/ch] = buffer_i32[i+j];
                }
            }

            flac_return = Flac.FLAC__stream_encoder_process(flac_encoder, channels, buffer_i32.length / wav_parameters.channels);
        }

        if (flac_return != true){
            console.error("Error: FLAC__stream_encoder_process_interleaved returned false. " + flac_return);
            flac_ok = Flac.FLAC__stream_encoder_get_state(flac_encoder);
            Flac.FLAC__stream_encoder_delete(flac_encoder);
            return {error: 'Encountered error while encoding.', status: flac_ok};
        }

        flac_ok &= Flac.FLAC__stream_encoder_finish(flac_encoder);

        Flac.FLAC__stream_encoder_delete(flac_encoder);

        return {metaData: meta_data, status: flac_ok};
    }


    static doFLAC(b64String) {
        console.log("Gonna return a promise that will do flac-ing..")
        let myPromise = new Promise(function(myResolve, myReject) {
            var fileInfo = [];

            var arrayBuffer = Utilities._base64ToArrayBuffer(b64String);
    
            var encData = [];
            var result = Utilities.encodeFlac(arrayBuffer, encData, isVerify(), isUseOgg());
            // console.log('encoded data array: ', encData);
            let metaData = result.metaData;
            
            // if(metaData){
                // console.log(metaData);
            // }
            
            var isOk = result.status;
            // console.log("processing finished with return code: ", isOk, (isOk == 1? " (OK)" : " (with problems)"));

            if(!result.error){
                // console.log("Encoded data : ");
                // console.log(encData, metaData);
                myResolve(encData);
                // forceDownload(blob, fileName);
            } else {
                
                myReject("Failed to encode", result.error);

            }
        });
        return myPromise;
    }

    
    static getUserMedia = function(params){
        if( navigator.mediaDevices &&  navigator.mediaDevices.getUserMedia){
            return navigator.mediaDevices.getUserMedia(params)
        }else if(navigator.webkitGetUserMedia){
            return navigator.webkitGetUserMedia(params)
        }else if (navigator.mozGetUserMedia){
            return navigator.mozGetUserMedia(params)
        }else{
            return navigator.getUserMedia(params)
        }
    }

}

class Streamer {
    
    BLOB = undefined;
    AUDIO = undefined;
    startRecording = undefined;
    stopRecording  = undefined;
    recordAudio = undefined;
    recognition_sid = undefined;
    recgIntervalMap = undefined;
    is_recording = false;
    selectedRecognizer = undefined;
    socketio = undefined;
    socket = undefined;
    resultpreview = undefined;
    startAudioRecording = undefined;
    stopAudioRecording = undefined;
    audioContext = undefined;
    onSocketConnect = undefined;
    onSocketDisConnect = undefined;
    onTranscriptionAvailable = undefined;
    onError = undefined;
    onStreamingResultsAvailable = undefined;
    onConversationResponseAvailable = undefined;
    uid = undefined;
    const_params = {};
    
    
    constructor(data) {
        console.info("Setting up streamer.");
        this.activeStream = undefined; //[];
        
        this.fps = 1
        this.asr_enabled = true
        this.wakeup_enabled = true;

        Object.assign(this, data);

        this.streamDestinationWSMap = {
            "asr" : undefined,
            "wakeup" : undefined,
            "image": undefined
        };

        this.const_params = {
            "enterprise_id": this.enterprise_id,//DAVE_SETTINGS.getCookie("dave_authentication")["X-I2CE-ENTERPRISE-ID"],
            "recognizer": this.recognizer,//DAVE_SETTINGS.RECOGNIZER,
            "model_name" : this.model_name,
            "origin" : window.location.href,
            "timestamp": Utilities.getTime(),
            "conversation_id" : this.conversation_id,//DAVE_SETTINGS.CONVERSATION_ID,
            "server" : this.base_url.split("//")[1],//DAVE_SETTINGS.BASE_URL.split("//")[1],
            "customer_id": this.customer_id,
            "engagement_id": this.engagement_id,
            "api_key": this.api_key
        }


        
        var that = this;

        if(navigator.permissions){
            if (this.asr && this.asr_type != "direct") {
                navigator.permissions.query(
                    {name : 'microphone'}
                ).then(
                    function(permissionStatus) {
                        console.log(permissionStatus);
                        if(permissionStatus.state == "denied"){
                            that.executeCallback("mic-denied", "Microphone Permission Denied");
                            console.error("Microphone access not granted by user "+permissionStatus.state);
                        } else if (permissionStatus.state == "granted") { // granted, denied, prompt
                            console.log("Microphone access granted.");
                            that.micAccess = true;
                            that.executeCallback("mic-granted", "Mic Access granted");
                        } else {
                            console.log()
                            console.error("Media device ");
                        }
                    
                        permissionStatus.onchange = function(){
                            console.log(this);
                            console.log("Microphone Permission changed to " + this.state);
                            that.executeCallback(this.state, this.state);
                        }
                    }
                );
            }
    
            
            if (this.image_processing && this.video_type != "direct") {
                navigator.permissions.query(
                    { name: 'camera' },
                ).then(
                    function(permissionStatus){
                        console.log(permissionStatus);
                        if(permissionStatus.state == "denied"){
                            that.executeCallback("camera-denied", "Camera Permission Denied");
                            console.error("Camera access not granted by user "+permissionStatus.state);
                        }else if (permissionStatus.state == "granted") { // granted, denied, prompt 
                            that.cameraAccess = true;
                            console.log("Camera access granted.");
                            that.executeCallback("camera-granted", "Camera access granted");
                        } else {
                            console.error("Media device ");
                        }
    
                        permissionStatus.onchange = function(){
                            console.log(this);
                            console.log("Permission changed to " + this.state);
                            that.executeCallback(this.state, this.state);
                        }
                    }
                );
    
                that.cc = CameraControls;
                // that.cc.cameraInit("vid");
            }
        }
        

        this.initSocket();           
        this.setupRTC();
    }
        
    set(key, value){
        this.const_params[key] = value;
    }
    get(key){
        return key ? this.const_params[key]: this.const_params;
    }
    //VAD
    // Define function called by getUserMedia 
    startUserMedia(stream) {
        var that = this;
        console.log(this.activeStreams);

        // this.activeStreams.push(stream);
        // Create MediaStreamAudioSourceNode
        this.vadSource = this.audioContext.createMediaStreamSource(stream);
        
        function __stop() {
            console.log("auto-stopped-recording")
            console.log('voice_stop');
            if (that.recordAudio) {
                let call_to_backend = true;
                let timeExceed = ((Date.now() - that.lastChunkSentTime) > 6000) ? true : false;
                if (!that.voiceActivity && timeExceed) {
                    call_to_backend = false;
                }
                that.stopAudioRecording(that.conv_params, call_to_backend);
                that.audioContext = undefined;
                that.voiceActivity = false;
                that.vadEnabled = false;
                // that.executeCallback("asr-stop_recoding", "auto_stopped_recording")
            }
        }
        // Setup options
        let options = {
            source: this.vadSource,
            voice_stop: __stop, 
            voice_start: function() {
                console.log('voice_start');
                // startVoiceRecording();
                that.voiceActivityActions();
                clearTimeout(time_out);
            }
        };

        // Create VAD
        this.vadobj = new VAD(options);
        var time_out = setTimeout(function(){
            that.executeCallback("asr-idel", "No voice activity");
            that.recordAudio = undefined;
            that.vadEnabled = false;
            that.is_recording=false;
            that.killAudioTracks();
        }, 5000);
    }

    voiceActivityActions(timeout = 15000) {
        let that = this;
        console.log("Setting Voice Activity to True.")
        this.voiceActivity = true;

        if (this.voiceActivityTimoutHandler) {
            clearTimeout(this.voiceActivityTimoutHandler);
        }

        this.voiceActivityTimoutHandler = setTimeout(function() {
            if(that.voiceActivity){
                that.executeCallback("asr-idel", "No voice activity");
                that.recordAudio = undefined;
                that.vadEnabled = false;
                that.is_recording=false;
                that.killAudioTracks();
            }
            that.voiceActivity = false;
        }, timeout);
    }

    setupVAD() {

        let that = this;
        console.log("Setting up VAD.");
        console.log(this.activeStreams);

        window.AudioContext =window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        
        if (!this.activeStream) {
            Utilities.getUserMedia(
                {audio: true}).then(
                function (stream) {
                    that.activeStream = stream;
                    that.startUserMedia(stream)
                },
                function(e) {
                    // console.log("No live audio input in this browser: " + e);
                });
        } else {
            this.startUserMedia(this.activeStream)
        }
    }

    cacheAndSendData(payload) {
        var that = this;
        console.log("Sending data to astream for "+this.streamDestination)
        Utilities.extendData(payload, this.asr_additional_data).then(
            function (data) {
                console.log(data);
                that.streamDestinationWSMap[that.streamDestination].emit("astream", data);
            },
            function () {
                that.executeCallback("stream_error", "extending payload failed");
                that.streamDestinationWSMap[that.streamDestination].emit("astream", payload);
            }
        )
        that.lastChunkSentTime = Date.now()
    }

    changeStreamDestination(dest) {
        console.log("Changing Stream destination to "+dest);
        this.streamDestination = dest;
        
        if (!this.streamDestinationWSMap[dest]) {
            throw dest+" Stream is not not defined";
        }

        if (dest == "asr") {
            this.stream_type = this.asr_type
        } else if(dest =="wakeup") {
            this.stream_type = this.wakeup_type            
        }

        //Implement image strem events here
    }

    executeCallback(event, data) {
        try {
            this.event_callback(event,data)
        } catch (e) {
            console.log(event, data);
            console.log("Executing callback failed.");
            console.error(e);
        }
        
    }

    initASREvents() {
        let that = this;
        this.streamDestinationWSMap.asr.on('connect', function(data) {
            that.executeCallback("asr-connect", "ASR Websocket connection established.");
        });

     
        this.streamDestinationWSMap.asr.on('disconnect', function () {
            that.executeCallback("asr-disconnect", "ASR Websocket connection is terminated.");
        });
        
        this.streamDestinationWSMap.asr.on('results', function (data) {
            if(that.recognition_sid != data["recognition_sid"]) return;
            
            // console.log(data);
            that.executeCallback("asr-results", data);
            that.stopPolling(that.audio_results_polling_manager);

        });
        
        this.streamDestinationWSMap.asr.on('intermediateResults', function(data) {
            console.log("ASR from speech server: ");
            // console.log(data);
        
            if(that.recognition_sid != data["recognition_sid"]) return;

            if (data["is_final"] == true) {
                console.log("Final data is received. Stopping polling.");
                that.executeCallback("asr-results",data);
                
                that.stopPolling(that.audio_results_polling_manager);
                // if (!that.vadEnabled) {
                // }
            } else {
                that.executeCallback("asr-intermediate-results",data);
            }            
        });
        
        this.streamDestinationWSMap.asr.on('error', function(data){
            console.log("backend error");
            if (that.onError && typeof(that.onError) == 'function' ) {
                that.executeCallback("asr-error", data);
            }
        });

        this.streamDestinationWSMap.asr.on('recText', function(data){

            if(typeof data != "object"){
                data = JSON.parse(data);
            }

            if(that.recognition_sid != data["recognition_sid"]) return;
            // console.log("recText: "+data);
            that.executeCallback("asr-recText", data);
            that.stopPolling(that.audio_results_polling_manager, false);
        });
        
        this.streamDestinationWSMap.asr.on('convResp', function(data){
            console.log("convResp:");
            console.log(data);
            
            if(typeof data != "object"){
                data = JSON.parse(data);
            }

            if(that.recognition_sid != data["recognition_sid"]) return;
            try {
                if(typeof data == "object"){
                    that.executeCallback("asr-convResp",data["conv_resp"] || data["conversation_api_response"] || {});
                }else{
                    that.executeCallback("asr-convResp",data);
                }
            } catch (e) {
                console.error(e);
            }
            that.stopPolling(that.audio_results_polling_manager);
            that.recognition_sid = undefined;
        });
    }

    initWakeupEvents() {

        let that = this;

        this.streamDestinationWSMap.wakeup.on('error', function(data){
            console.log("backend error");
            if (that.onError && typeof(that.onError) == 'function' ) {
                that.executeCallback("wakeup-error", data);
            }
        });
        
        
        
        this.streamDestinationWSMap.wakeup.on('hotword', function(data) {
            console.log(data);
            that.detectWakeup = false;
            that.stopPolling(that.audio_results_polling_manager);
            that.executeCallback("wakeup-hotword", data)
            // that.changeStreamDestination("asr");
            if (!that.auto_asr_detect_from_wakeup) {
                that.stopAudioRecording(this.conv_params, false)
            } else {
                that.stopAudioRecording(this.conv_params, false)
                that.start_asr()
            }
        });
    }

    initImageEvents() {
        let that = this;
        this.streamDestinationWSMap.image.on('connect', function(data) {
            that.executeCallback("imagews-connect", "Websocket connection to image server established.");
        });

     
        this.streamDestinationWSMap.image.on('disconnect', function () {
            that.executeCallback("imagews-disconnect", "Websocket connection to image server is terminated.");
        });

        this.streamDestinationWSMap.image.on('intermediateFaceDetectorResults', function(xe){
            try {
                console.log(xe);
            } catch(e) {
                console.error(e);
            }
        });

        this.streamDestinationWSMap.image.on("intermediateClassifierResults", function(e){
            try {
                // console.log(e);
                that.executeCallback("imagews-results", e);
            } catch(e) {
                console.error(e);
            }
        });
    }

    initSocket() {


        // this.changeStreamDestination("wakeup");

        this.uid = Utilities.makeid(6);

        console.log(`Setting up Socketio.`);
     
        if (this.image_processing && this.image_server) {
            console.log("Initng Image server.");
            this.streamDestinationWSMap.image = io(this.image_server, {query:"uid="+this.uid});
            this.initImageEvents();
            this.streamDestination = "image";
        }
        
        if (this.wakeup && this.wakeup_server) {
            this.streamDestinationWSMap.wakeup = io(this.wakeup_server, {query:"uid="+this.uid});
            this.initWakeupEvents();
            this.streamDestination = "wakeup";
        }
        
        if (this.asr && this.asr_server) {
            this.streamDestinationWSMap.asr = io(this.asr_server, {query:"uid="+this.uid});
            this.initASREvents();
            this.streamDestination = "asr";
        }
    }
    
    start_asr() {
        if (this.asr == false) {
            if (this.detectWakeup) {
                console.log("Wakeup is not detected yet.");
                return;
            }
        }
        
        this.changeStreamDestination('asr');
        this.executeCallback("asr-recording", "recording");
        this.startAudioRecording();
    }

    check_is_recording() {
        // console.log("record check "+this.is_recording);
        if (this.is_recording == true) {
            return true;
        } else {
            return false;
        }
    }
    //Polling functions.
    //This function polls wesocket server for intermediate results every 2 seconds.
    createPolling(uid, recognition_sid, interval = 2000) {
        var that = this;
        var poll_counter = 50;
        console.log("Creating polling (for "+that.streamDestination+")");

        const intervalObject = setInterval(function() {
            // console.log(that.check_is_recording());
            if (that.check_is_recording() == false) {
                poll_counter = poll_counter - 1;
                console.log("Polling ends after "+poll_counter+" trials.")
                if (poll_counter <= 0) {
                    that.stopPolling(that.audio_results_polling_manager);
                }
            }
            // console.log("This messsage gets printed every 2 seconds.");
            if (that.streamDestination == "wakeup") {
                console.log("Polling for wakeup.");
                that.streamDestinationWSMap["wakeup"].emit("hotwordResults",{"uid":uid,"recognition_sid":recognition_sid});
            } else {
                console.log("Polling for asr.");
                that.streamDestinationWSMap["asr"].emit("intermediateResults",{"uid":uid,"sid":recognition_sid});
            }
        }, interval);
    
        return intervalObject;
    }

    stopPolling(intervalObject, clear = true) {
        console.log("Stopping polling..");
        clearInterval(intervalObject);
        if (clear) {
            this.recognition_sid = undefined;
        }
    }

    // startRecording(customer_id, system_response) {

    // }

    replaceAudio(src) { 
        var newAudio = document.createElement('audio');
        // var newAudio = document.getElementById("playback");
        newAudio.controls = true; 
        newAudio.autoplay = true; 
        if(src) { 
            newAudio.src = src;
        }
        
        // var parentNode = newAudio.parentNode; 
        // newAudio.innerHTML = ''; 
        // newAudio.appendChild(newAudio); 
        AUDIO = newAudio; 
    }

    setupRTC() {
        var that = this;
        console.log("Setting up RTC.");
        // if (that.vad) {
        //     this.setupVAD();
        // }
        this.startAudioRecording = function(conv_params = {}) {
                console.log("Record")
                
                // this.startRecordingButton.style.display = 'block';
                // this.stopRecordingButton.style.display = 'none';  
    
                that.is_recording = true;
                Utilities.getUserMedia(
                    {audio: true}).then(
                    function(stream) {
                        that.micAccess=true;
                        console.log("Active Stream set.");
                        that.activeStream = stream;
                        that.executeCallback(that.streamDestination+"-recording", "recording");
                        that.recordAudio = RecordRTC(
                            stream, 
                            {
                                type: 'audio',
                                mimeType: 'audio/wav',
                                sampleRate: 44100,
                                timeSlice: 2000,
                                bufferSize : 1024,
                                recorderType: StereoAudioRecorder,
                                numberOfAudioChannels: 1,
                            
                                ondataavailable: function(blob) {
                                    
                                    // console.log(that.stream_type);
                                    if (!that.recognition_sid) {
                                        that.recognition_sid = Utilities.makeid(8);
                                        that.audio_results_polling_manager = that.createPolling(that.uid, that.recognition_sid);
                                    }

                                    if (that.stream_type == "full") {
                                        that.BLOB = blob;
                                    } else if (that.stream_type == "chunks") {

                                        
                                        // console.log("ASR CHUNKS");
                                        conv_params = {...conv_params, ...that.const_params, ...{
                                            "size":blob.size,
                                            "blob":blob, 
                                            "recognition_sid":that.recognition_sid, 
                                            "is_recording":that.is_recording,
                                            "timestamp": Utilities.getTime(),
                                            "recognizer" : that.recognizer,
                                            "model_name" : that.model_name
                                        }};
                                        
                                        
                                        // console.log(payload);
                                        
                                        that.cacheAndSendData(conv_params);
                                        // this.socketio.emit('astream', audio_payload);
                                    }
                                }
                            }
                        );
                        
                        that.recordAudio.startRecording();
                        if(!that.vad){
                            setTimeout(function(){
                                if(that.is_recording){
                                    that.stopAudioRecording(conv_params)
                                }
                            }, 10000);
                        }
                        
                        // this.stopRecordingButton.style.display = 'block';
                    }, 
                    function(error) {console.error(JSON.stringify(error));}
                );
        };
    
        this.stopAudioRecording = function(conv_params={}, call_to_backend = true) {
            console.log(`Call to backedn ${call_to_backend}.`)
            if(that.micAccess){
                console.log("Stopping stream to ASR.");
                // console.log("Conversation Params");
                // console.log(conv_params);
                // recording stopped
                // this.startRecordingButton.style.display = 'block';
                // this.stopRecordingButton.style.display = 'none';
                                
                that.is_recording = false;

                if (call_to_backend) {

                    conv_params = { ...conv_params, ...that.const_params, ...{
                        "size":0,
                        "blob":"", 
                        "recognition_sid":that.recognition_sid, 
                        "is_recording":that.is_recording,
                        "timestamp": Utilities.getTime()
                    }};


                    
                    if (that.stream_type == "chunks") {
                        that.executeCallback(that.streamDestination+"-processing", "processing");
                        that.streamDestinationWSMap[that.streamDestination].emit('astream', conv_params);
                    }
                }
                
                if (!that.recordAudio) {
                    console.log("Audio recording already stopped.");
                    return;
                }
                //// stop audio recorder
                that.recordAudio.stopRecording(function() {
                    console.log("Stopping recording.");
                    if (that.stream_type == "full" && call_to_backend) {

                        // replaceAudio(URL.createObjectURL(that.BLOB));
                        // AUDIO.play();
                        // after stopping the audio, get the audio data
                        that.recordAudio.getDataURL(function(audioDataURL) {
                            if (call_to_backend) {
                                
                                var payload = { ...conv_params, ...that.const_params, ...{
                                    "size":0,
                                    "recognition_sid":that.recognition_sid, 
                                    "is_recording":that.is_recording,
                                    "timestamp": Utilities.getTime(),
                                    "recognizer" : that.recognizer,
                                    "model_name" : that.model_name
                                }};

                                if (that.recognizer == "google") {
                                    // console.log("Sending data for google recognition via flacking channel.");
                                    // that.onWavLoad(files.audio.dataURL.split(",")[1], selectedRecognizer);
                                    Utilities.doFLAC(audioDataURL.split(",")[1]).then(
                                        function (encData, metaData) {
                                            // console.log(encData);

                                            let blob = exportFlacFile(encData, metaData, false);
                                            // var fileName = getFileName("flactest", isUseOgg()? 'ogg' : 'flac');
                                            let reader = new FileReader();
                                            reader.onload = function() {
                                                
                                                payload.blob = reader.result;
                                    
                                                // console.log(payload);
                                                that.streamDestinationWSMap["asr"].emit("flacking", payload);
                                                that.executeCallback(that.streamDestination+"-processing", "processing");
                                                that.killAudioTracks();
                                            }

                                            reader.readAsDataURL(blob);

                                        },
                                        function (messageString, error) {
                                            console.log("There is an error.");
                                            console.log(messageString);
                                            console.log(error);
                                            that.executeCallback("asr-error", "FLAC encoding failed");
                                        }
                                    )
                                } else {
                                    payload.blob = audioDataURL;
                                    that.executeCallback(that.streamDestination+"-processing", "processing");
                                    that.streamDestinationWSMap["asr"].emit('stt', payload);
                                    that.killAudioTracks();
                                }
                            } 
                            
                        });
                    } else {   
                        that.killAudioTracks();
                    }

                });

            }
        };
    }

    getMedia(requests, callback){
        var that = this;
        
        if(Utilities.getUserMedia()){
            if(that._request_pending){
                that.executeCallback("interaction", InteractionStageEnum.MIC_REQUESTED);
            }
            Utilities.getUserMedia(requests, function(stream) {
                console.debug("Cool:::Got auth for audio input");
                if(that._request_pending){
                    that.executeCallback("interaction", InteractionStageEnum.MIC_ALLOWED);
                    that._request_pending=false;
                }
                callback(stream);
            }, function(error) {
                console.log("error while mic init");
                console.log(error);
                if(that._request_pending){
                    that.executeCallback("interaction", InteractionStageEnum.MIC_REJECTED);
                    that._request_pending=false;
                }
                callback(false, error);
                that.mediaFailed();
            });
        }else{
            callback(false);
        }
    }

    mediaPermissions(){
        //class Streamer
        var that = this;
        function callbacks(sts){
            that._request_pending = false;
            if(sts){
                that.executeCallback("interaction", InteractionStageEnum.MIC_ALLOWED);
            }else{
                that.executeCallback("interaction", InteractionStageEnum.MIC_REJECTED);
                that.mediaFailed();
            }
        }
        // this.getMedia({audio: true}, callbacks);
        
        if(navigator.permissions){
            navigator.permissions.query({name:'microphone'}).then(function(result) {
                console.debug(result.state)
                if(result.state == "denied"){
                    callbacks(false);
                }else if(result.state == "granted") {
                    callbacks(true);
                }
               });
        }
    }

    killAudioTracks() {
        if (this.vadEnabled) {
            this.vadSource.disconnect()
            this.vadobj.scriptProcessorNode.disconnect()
            this.vadobj = undefined;
            this.vadEnabled = false;
        }
        
        if (this.activeStream) {
            console.log(this.activeStream.getTracks());
            let tracks = this.activeStream.getTracks();
            tracks.forEach(track => {
                console.log("Killing track.");
                track.stop();
            });
        }
        this.recordAudio = undefined;
        this.activeStream = undefined;
    }

    forceStopRecording() {
        this.stopAudioRecording({},false);
        this.killAudioTracks();
        this.stopPolling(this.audio_results_polling_manager);
    }
    forceStopWakeup = this.forceStopRecording;

    cancelRecordStopTimer(id) {
        clearTimeout(id);
    }   

    startRecordStopTimer(T) {
        this.recordTimer = setTimeout(function() {
            console.log("Record timout stopping recoding.")
            this.stopVoiceRecording();
        }, T * 1000);
    }
    
    captureImage() {
        let image = this.cc.captureImage();
        return image;
    }
    captureVideo(){

    }

    stopImageResultsPolling() {
        console.log("Stopping image results polling.");
        clearInterval(this.image_results_polling_manager);
    }

    startImageResultsPolling() {
        let that = this;
        this.image_results_polling_manager = setInterval(function() {
            console.log("Polling for image classifier results.")
            that.streamDestinationWSMap.image.emit("intermediateClassifierResults", {"uid":that.uid, "sid":that.image_recognition_sid});
        }, 1000);
    }

    start_video_capture(frames_to_capture = undefined , subsampling_factor = undefined, img_data = undefined) {
        this.is_video_recording = true	
        this.cc.cameraInit("vid");
        var that =  this;
        if (!this.image_recognition_sid) {
            console.log("Generating image rsid.");
            this.image_recognition_sid = Utilities.makeid(8)
            this.startImageResultsPolling();
        }

        function _post(img_data){
            console.log("Sending image to server.");
            let imageData = img_data;
            console.log(that.image_classifier);
            let payload = '[enterprise_id][conversation_id][customer_id][engagement_id][api_key][system_response][timestamp]||||{"recognizer_type":"selectedRecognizer", "classNames":["'+that.image_classifier+'"]}||||'+imageData+'||||';
            that.streamDestinationWSMap.image.emit("imageStream",{"uid":that.uid,"sid":that.image_recognition_sid,"is_recording":that.is_video_recording, "data":payload});

        }
        if(!img_data){
            this.image_capture_manager = setInterval(function() {
                if (frames_to_capture == 0) {
                    that.executeCallback("imagews-capture_ended", "capture_ended");
                    that.stop_video_capture();
                    return
                } else {
                    console.log(`Will capture ${frames_to_capture} more frames.`)
                    frames_to_capture = frames_to_capture - 1;
                }
                _post(that.captureImage());	
            }, 1000/this.fps);
        }else{
            _post(img_data)
        }    
        that.executeCallback("image-recording", "recording");
    }

    stop_video_capture() {
        clearInterval(this.image_capture_manager);
        this.is_video_recording = false;
        this.cc.stopMediaTracks(this.cc.currentMediaStream)
        this.stopImageResultsPolling();
        this.image_recognition_sid = undefined; 
        this.executeCallback("image-stoprecording", "stoprecording");
    }

    startVoiceRecording(conv_params){
        //if any audio/video stream is ON just kill them
        if (this.vad && !this.vadEnabled) {
            this.setupVAD();
            this.vadEnabled = true;
        }
        this.conv_params = conv_params;
        
        this.changeStreamDestination("asr");
        this.startAudioRecording(conv_params)
        console.log(this.audio_auto_stop);
        // this.startRecordStopTimer(this.audio_auto_stop);
    }
    stopVoiceRecording(){
        this.stopAudioRecording(this.conv_params)
    }
    startWakeupRecording(conv_params){
        //if any audio/video stream is ON just kill them
        //same as startAsrRecording.
        this.conv_params = conv_params;
       
        this.changeStreamDestination("wakeup");
        this.startAudioRecording(conv_params)
    }
    stopWakeupRecording(){
        this.stopAudioRecording({}, false)
    }

    startVideoRecording(){
        this.start_video_capture(this.frames_to_capture, this.subsampling_factor)
    }
    stopVideoRecording(){
        this.stop_video_capture()
    }
} 