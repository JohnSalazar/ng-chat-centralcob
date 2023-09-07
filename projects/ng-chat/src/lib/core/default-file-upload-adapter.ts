import { IFileUploadAdapter } from './file-upload-adapter';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message } from './message';

export class DefaultFileUploadAdapter implements IFileUploadAdapter {
  /**
   * @summary Basic file upload adapter implementation for HTTP request form file consumption
   * @param _serverEndpointUrl The API endpoint full qualified address that will receive a form file to process and return the metadata.
   */
  constructor(
    private _serverEndpointUrl: string,
    private _http: HttpClient,
  ) {}

  uploadFile(file: File, participantId: any): Observable<Message> {
    const formData: FormData = new FormData();

    formData.append('ng-chat-participant-id', participantId);
    formData.append('file', file, file.name);

    return this._http.post<Message>(this._serverEndpointUrl, formData);
  }
}
