var util = require('util');
var pgp = require('pg-promise')();
var qrm = pgp.queryResult;
var debug = require('debug')('connect:session-pg-promise')

module.exports = function (session) {
    var Store = session.Store;
    var defaultOptions = {
        expiration: 24 * 60 * 60 * 1000,
        checkExpirationInterval: 15 * 60 * 1000,
        schemaName: null,
        tableName: 'session' 
    };
      
    class PgPromiseStore extends Store {
        constructor(options) {
            super();
                
            this.options = Object.assign(defaultOptions, options);
            if(!this.options.db){
                throw new Error('Database connection is required');
            }
            
            this.db = this.options.db;
            
            Store.call(this, this.options);
            this._startExpiringSessions();
        }
        
        _getTimeExpires(sess) {
            return sess.cookie && +new Date(sess.cookie.expires) || Math.ceil(Date.now()/1000 + ((typeof originalMaxAge === 'number') && originalMaxAge || this.options.expiration));
         }
         
        _getTableName(){
            if(this.options.schemaName){
                return this.options.schemaName + '.' + JSON.stringify(this.options.tableName);
            }
            return JSON.stringify(this.options.tableName);
        }
        
        get(sid, fn){
            
            debug(`SELECT ${sid}`);
            this.db.one("SELECT sess FROM ${table^} WHERE sid=${sid} AND expires > NOW()", {
                sid,
                table: this._getTableName()
            }, qrm.one | qrm.none )
            .then((res)=>{
                debug(`FOUND ${sid} with data ${res}`);
                return res && res.sess;             
            }).asCallback(fn);
        }
        
        set(sid, sess, fn){
            const expires = this._getTimeExpires(sess);
            const data = JSON.stringify(sess);
            
            this.db.any("UPDATE ${table^} SET sess = ${sess}, expires=to_timestamp(${expires}) WHERE sid = ${sid} RETURNING sid",{
                sess: data,
                expires,
                sid,
                table: this._getTableName()
            })
            .then((res)=>{
                 if(!res || !res.length){
                    this.db.none("INSERT INTO ${table^} (sess, expires, sid) SELECT ${sess}, to_timestamp(${expires}), ${sid} WHERE NOT EXISTS (SELECT 1 FROM ${table^} WHERE sid = ${sid})",{
                        sess: data,
                        sid,
                        expires,
                        table: this._getTableName()
                    }).asCallback(fn);
                } else {
                    fn();
                }
                return res;
            }).error(fn);
            
        }
      
        destroy(sid, fn) {
            this.db.query("DELETE FROM ${table^} WHERE sid = ${sid}", {
                sid,
                table: this._getTableName()
            }).return(null).asCallback(fn);
        }
        
        touch(sid, sess, fn){
            this.db.one("UPDATE ${table^} SET expires = to_timestamp(${expires}) WHERE sid = ${sid} RETURNING sid", {
               sid,
               expires: this._getTimeExpires(sess), 
               table: this._getTableName() 
            }).return(sid).asCallback(fn);
        }
        
        _clearExpiredSessions(){
            debug('CLEARING EXPIRED SESSIONS');
            return this.db.query("DELETE FROM ${table^} WHERE expires < NOW()", {
                table: this._getTableName()
            });
        }
        
        _startExpiringSessions() {
            this._stopExpiringSessions();
            if (this.options.checkExpirationInterval > 0) {
                this._expirationInterval = setInterval(this._clearExpiredSessions.bind(this), this.options.checkExpirationInterval);
            }
        }
        
        _stopExpiringSessions() {
            if (this._expirationInterval) {
                clearInterval(this._expirationInterval);
            }
        }
    }
    
    return PgPromiseStore;
    
};