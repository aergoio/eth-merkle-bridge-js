/**
 * @fileoverview gRPC-Web generated client stub for 
 * @enhanceable
 * @public
 */

// GENERATED CODE -- DO NOT EDIT!



const grpc = {};
grpc.web = require('grpc-web');

const proto = require('./unfreeze_service_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.UnfreezeServiceClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options['format'] = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?Object} options
 * @constructor
 * @struct
 * @final
 */
proto.UnfreezeServicePromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options['format'] = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname;

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.AccountRef,
 *   !proto.Status>}
 */
const methodDescriptor_UnfreezeService_RequestUnfreeze = new grpc.web.MethodDescriptor(
  '/UnfreezeService/RequestUnfreeze',
  grpc.web.MethodType.UNARY,
  proto.AccountRef,
  proto.Status,
  /**
   * @param {!proto.AccountRef} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Status.deserializeBinary
);


/**
 * @const
 * @type {!grpc.web.AbstractClientBase.MethodInfo<
 *   !proto.AccountRef,
 *   !proto.Status>}
 */
const methodInfo_UnfreezeService_RequestUnfreeze = new grpc.web.AbstractClientBase.MethodInfo(
  proto.Status,
  /**
   * @param {!proto.AccountRef} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.Status.deserializeBinary
);


/**
 * @param {!proto.AccountRef} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.Error, ?proto.Status)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.Status>|undefined}
 *     The XHR Node Readable Stream
 */
proto.UnfreezeServiceClient.prototype.requestUnfreeze =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/UnfreezeService/RequestUnfreeze',
      request,
      metadata || {},
      methodDescriptor_UnfreezeService_RequestUnfreeze,
      callback);
};


/**
 * @param {!proto.AccountRef} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.Status>}
 *     A native promise that resolves to the response
 */
proto.UnfreezeServicePromiseClient.prototype.requestUnfreeze =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/UnfreezeService/RequestUnfreeze',
      request,
      metadata || {},
      methodDescriptor_UnfreezeService_RequestUnfreeze);
};


module.exports = proto;

