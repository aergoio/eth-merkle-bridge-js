.PHONY: protoc

protoc:
	protoc -I=. unfreeze_service.proto --js_out=import_style=commonjs:.
	protoc -I=. unfreeze_service.proto --grpc-web_out=import_style=commonjs,mode=grpcwebtext:.