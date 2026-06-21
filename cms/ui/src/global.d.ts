/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    CMS_BASE_PATH?: string;
    API: any;
    Toast: any;
    App: any;
    CMSSidebar: any;
    CMSEditor: any;
    CMSEditorLib: any;
    CMSEditorPreview: any;
    CMSModal: any;
    CMSMediaPicker: any;
    CMSSnapshots: any;
    CMSBlog: any;
    Editor: any;
    Blog: any;
    Snapshots: any;
  }
}
export {};
