// +-+-+-+-+-+-+
// |y|o|o|n|i|t|
// +-+-+-+-+-+-+
//
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
// | Yoonit Camera Plugin for NativeScript applications              |
// | Luigui Delyer, Haroldo Teruya,                                  |
// | Victor Goulart & Márcio Bruffato @ Cyberlabs AI 2020            |
// +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

import {
    StatusEventData,
    ImageCapturedEventData,
    FaceDetectedEventData,
    QRCodeScannedEventData,
} from '.';
import { CameraBase } from './Yoonit.Camera.common';
import * as permissions from 'nativescript-permissions';
import {
    EventData,
    ImageSource,
    File
} from '@nativescript/core';
import Validator from "./helpers/Validator";

const CAMERA = () => (android as any).Manifest.permission.CAMERA;

export class YoonitCamera extends CameraBase {

    nativeView: ai.cyberlabs.yoonit.camera.CameraView;

    public createNativeView(): Object {
        this.nativeView = new ai.cyberlabs.yoonit.camera.CameraView(this._context);
        this.nativeView.setCameraEventListener(CameraEventListener.initWithOwner(new WeakRef(this)));

        return this.nativeView;
    }

    /**
     * Initializes properties/listeners of the native view.
     */
    initNativeView(): void {
        // Attach the owner to nativeView.
        // When nativeView is tapped we get the owning JS object through this field.
        (<any>this.nativeView).owner = this;
        super.initNativeView();

        Validator.PropMap.forEach((prop) => {
            if (this.nativeView[prop.name]) {
                this.nativeView[prop.name](prop.value);
            }
        });
        Validator.PropMap = null;
    }

    /**
     * Clean up references to the native view and resets nativeView to its original state.
     * If you have changed nativeView in some other way except through setNative callbacks
     * you have a chance here to revert it back to its original state
     * so that it could be reused later.
     */
    disposeNativeView(): void {
        this.nativeView.stopCapture();

        // Remove reference from native view to this instance.
        (<any>this.nativeView).owner = null;

        // If you want to recycle nativeView and have modified the nativeView
        // without using Property or CssProperty (e.g. outside our property system - 'setNative' callbacks)
        // you have to reset it to its initial state here.
        super.disposeNativeView();
    }

    public requestPermission(explanation: string = ''): Promise<boolean> {
        return new Promise((resolve, reject) => permissions
            .requestPermission(CAMERA(), explanation)
            .then(() => resolve(true))
            .catch(err => reject(false))
        );
    }

    public hasPermission(): boolean {
        return permissions.hasPermission(CAMERA());
    }
}

@Interfaces([ai.cyberlabs.yoonit.camera.interfaces.CameraEventListener])
@NativeClass()
class CameraEventListener extends java.lang.Object implements ai.cyberlabs.yoonit.camera.interfaces.CameraEventListener {

    constructor(private owner: WeakRef<YoonitCamera>) {
        super();

        // Required by Android runtime when native class is extended through TypeScript.
        return global.__native(this);
    }

    public static initWithOwner(owner: WeakRef<YoonitCamera>): CameraEventListener {
        return new CameraEventListener(owner);
    }

    private imageProcessing(imagePath: string): object {
      const source: ImageSource = ImageSource.fromFileSync(imagePath);
      const imageFile = File.fromPath(imagePath);
      const binary = imageFile.readSync();

      return {
        path: imagePath,
        source,
        binary
      };
    }

    public onImageCaptured(
        type: string,
        count: number,
        total: number,
        imagePath: string
    ): void {

        const owner = this.owner.get();
        const image = this.imageProcessing(imagePath);

        if (owner) {
            owner.notify({
                eventName: 'imageCaptured',
                object: owner,
                type,
                count,
                total,
                image
            } as ImageCapturedEventData);
        }
    }

    public onFaceDetected(
        x: number,
        y: number,
        width: number,
        height: number
    ): void {

        const owner = this.owner.get();

        if (owner) {
            owner.notify({
                eventName: 'faceDetected',
                object: owner,
                x,
                y,
                width,
                height
            } as FaceDetectedEventData);
        }
    }

    public onFaceUndetected(): void {
        const owner = this.owner.get();

        if (owner) {
            owner.notify({
                eventName: 'faceDetected',
                object: owner,
                x: null,
                y: null,
                width: null,
                height: null
            } as EventData);
        }
    }

    public onEndCapture(): void {
        const owner = this.owner.get();

        if (owner) {
            owner.notify({
                eventName: 'endCapture',
                object: owner,
            } as EventData);
        }
    }

    public onQRCodeScanned(content: string): void {
        const owner = this.owner.get();

        if (owner) {
            owner.notify({
                eventName: 'qrCodeContent',
                object: owner,
                content
            } as QRCodeScannedEventData);
        }
    }

    public onError(error: string): void {
        const owner = this.owner.get();

        if (owner) {
            owner.notify({
                eventName: 'status',
                object: owner,
                status: {
                  type: 'error',
                  status: error
                }
            } as StatusEventData);
        }
    }

    public onMessage(message: string): void {
        const owner = this.owner.get();

        if (owner) {
            owner.notify({
                eventName: 'status',
                object: owner,
                status: {
                  type: 'message',
                  status: message
                }
            } as StatusEventData);
        }
    }

    public onPermissionDenied(): void {
        const owner = this.owner.get();

        if (owner) {
            owner.notify({
                eventName: 'permissionDenied',
                object: owner,
            } as EventData);
        }
    }
}
