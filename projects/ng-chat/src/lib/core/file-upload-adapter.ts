import { Observable } from 'rxjs';
import { Message } from './message';

export interface IFileUploadAdapter {
  uploadFile(file: File, participantId: any): Observable<Message>;
}
