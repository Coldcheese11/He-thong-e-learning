import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Send, Calendar, MessageSquare, MoreVertical, FileText, User, ArrowLeft, X, UploadCloud, Eye, CheckCircle, Trash2, Upload, AlertCircle } from 'lucide-react';

export default function Classroom() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [classInfo, setClassInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States Form đăng bài (Giáo viên) - Nâng cấp thành Mảng (Array) để chứa nhiều file
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]); // Mảng chứa nhiều file
  const fileInputRef = useRef(null);

  // States Comment
  const [commentInputs, setCommentInputs] = useState({});
  const [isCommenting, setIsCommenting] = useState(false);

  // States Nộp Bài (Học Sinh) - Nâng cấp thành Mảng
  const [submitFiles, setSubmitFiles] = useState({}); // { postId: [file1, file2] }
  const [isSubmitting, setIsSubmitting] = useState({});

  // Trình xem file
  const [previewFile, setPreviewFile] = useState(null);

  const currentUserRole = localStorage.getItem('user_role');
  const currentUserId = localStorage.getItem('user_id');

  useEffect(() => {
    fetchClassData();
  }, [id]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const { data: cData } = await supabase.from('classes').select('*, users(full_name)').eq('id', id).single();
      setClassInfo(cData);

      const { data: pData } = await supabase
        .from('class_posts')
        .select(`*, users (full_name), post_comments (*, users(full_name)), post_submissions (*, users(full_name))`)
        .eq('class_id', id)
        .order('created_at', { ascending: false });
      
      const formattedPosts = pData?.map(post => ({
        ...post,
        post_comments: post.post_comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
        post_submissions: post.post_submissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }));
      setPosts(formattedPosts || []);
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // HÀM HỖ TRỢ: Upload MỘT file lên Supabase
  const uploadSingleFile = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${id}/${fileName}`;
    const { error } = await supabase.storage.from('class_documents').upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from('class_documents').getPublicUrl(filePath);
    return { name: file.name, url: data.publicUrl }; // Trả về cả tên và url
  };

  // HÀM HỖ TRỢ: Upload NHIỀU file
  const uploadMultipleFiles = async (filesArray) => {
    if (!filesArray || filesArray.length === 0) return null;
    const uploadedData = [];
    for (let file of filesArray) {
      const result = await uploadSingleFile(file);
      uploadedData.push(result);
    }
    return JSON.stringify(uploadedData); // Biến mảng thành chuỗi để lưu vào Database
  };

  // HÀM HỖ TRỢ: Phân giải chuỗi file từ Database ra Mảng để hiển thị
  const parseFiles = (fileString) => {
    if (!fileString) return [];
    if (fileString.startsWith('[')) {
      try { return JSON.parse(fileString); } catch (e) { return []; }
    }
    // Hỗ trợ ngược cho các bài đăng cũ chỉ lưu 1 link
    return [{ name: "Tài liệu đính kèm", url: fileString }];
  };

  // ===================== XỬ LÝ CHỌN NHIỀU FILE =====================
  const handleTeacherFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (uploadFiles.length + files.length > 10) return alert("Giáo viên chỉ được tải lên tối đa 10 file 1 lần.");
    setUploadFiles([...uploadFiles, ...files]);
  };

  const removeTeacherFile = (index) => {
    const newFiles = [...uploadFiles];
    newFiles.splice(index, 1);
    setUploadFiles(newFiles);
  };

  const handleStudentFileSelect = (e, postId) => {
    const files = Array.from(e.target.files);
    const currentFiles = submitFiles[postId] || [];
    if (currentFiles.length + files.length > 5) return alert("Học sinh chỉ được nộp tối đa 5 file.");
    setSubmitFiles({ ...submitFiles, [postId]: [...currentFiles, ...files] });
  };

  const removeStudentFile = (postId, index) => {
    const currentFiles = submitFiles[postId] || [];
    const newFiles = [...currentFiles];
    newFiles.splice(index, 1);
    setSubmitFiles({ ...submitFiles, [postId]: newFiles });
  };
  // ===================================================================

  // GIÁO VIÊN ĐĂNG BÀI
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return alert("Nhập tiêu đề!");
    setIsPosting(true);
    try {
      const finalFilesString = await uploadMultipleFiles(uploadFiles);

      await supabase.from('class_posts').insert([{
        class_id: id, teacher_id: currentUserId, title: newTitle, content: newContent,
        file_url: finalFilesString, deadline: newDeadline || null
      }]);
      
      setNewTitle(''); setNewContent(''); setNewDeadline(''); setUploadFiles([]);
      fetchClassData();
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsPosting(false);
    }
  };

  // BÌNH LUẬN HỎI ĐÁP
  const handleSendComment = async (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId] || '';
    if (!text.trim()) return;

    setIsCommenting(true);
    try {
      await supabase.from('post_comments').insert([{ post_id: postId, user_id: currentUserId, content: text }]);
      setCommentInputs({ ...commentInputs, [postId]: '' });
      fetchClassData();
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsCommenting(false);
    }
  };

  // HỌC SINH NỘP BÀI
  const handleSubmitAssignment = async (postId) => {
    const files = submitFiles[postId];
    if (!files || files.length === 0) return alert("Vui lòng chọn ít nhất 1 file để nộp!");

    setIsSubmitting({ ...isSubmitting, [postId]: true });
    try {
      const filesString = await uploadMultipleFiles(files);
      await supabase.from('post_submissions').insert([{
        post_id: postId, student_id: currentUserId, file_url: filesString
      }]);

      setSubmitFiles({ ...submitFiles, [postId]: [] });
      alert("✅ Nộp bài thành công!");
      fetchClassData();
    } catch (error) {
      alert("Lỗi nộp bài: " + error.message);
    } finally {
      setIsSubmitting({ ...isSubmitting, [postId]: false });
    }
  };

  const handleUnsubmit = async (submissionId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy nộp bài để làm lại không?")) return;
    try {
      await supabase.from('post_submissions').delete().eq('id', submissionId);
      fetchClassData();
    } catch (error) {
      alert("Lỗi hủy bài: " + error.message);
    }
  };

  const renderFileViewer = (url) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('.pdf')) return <iframe src={url} className="w-full h-[70vh] rounded-xl border border-gray-200" title="PDF" />;
    if (lower.includes('.doc') || lower.includes('.ppt') || lower.includes('.xls')) return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} className="w-full h-[70vh] rounded-xl border border-gray-200" title="Office" />;
    if (lower.match(/\.(jpeg|jpg|gif|png|svg)$/)) return <img src={url} alt="Doc" className="max-w-full max-h-[70vh] object-contain mx-auto rounded-xl bg-gray-50" />;
    return <div className="text-center p-10"><a href={url} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-6 py-2 rounded-lg">Tải file về</a></div>;
  };

  if (loading) return <div className="text-center p-20 font-bold text-gray-500">Đang tải...</div>;
  if (!classInfo) return <div className="text-center p-20 font-bold text-red-500">Lớp học không tồn tại!</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 relative">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
          <div className="font-bold text-xl text-gray-800">{classInfo.name} <span className="text-sm text-gray-500 ml-2">Mã: {classInfo.invite_code}</span></div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto mt-6 px-4 space-y-6">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl h-48 p-8 text-white shadow-lg flex flex-col justify-end relative overflow-hidden">
          <h1 className="text-4xl font-black mb-2 relative z-10">{classInfo.name}</h1>
          <p className="font-medium text-blue-100 relative z-10">Giáo viên: {classInfo.users?.full_name || 'Đang cập nhật'}</p>
        </div>

        {/* GIÁO VIÊN ĐĂNG BÀI */}
        {(currentUserRole === 'teacher' || currentUserRole === 'super_admin') && (
          <form onSubmit={handleCreatePost} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">Đăng thông báo / Giao bài tập</h3>
            <input type="text" required placeholder="Tiêu đề..." value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-4 py-3 mb-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
            <textarea rows="3" placeholder="Nội dung..." value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full px-4 py-3 mb-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            
            {/* Hiển thị danh sách file Giáo viên chọn */}
            {uploadFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                {uploadFiles.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
                    <span className="truncate mr-4"><FileText size={14} className="inline mr-2"/>{file.name}</span>
                    <button type="button" onClick={() => removeTeacherFile(idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                {/* Cho phép chọn nhiều file, thêm các định dạng bạn yêu cầu */}
                <input type="file" multiple ref={fileInputRef} onChange={handleTeacherFileSelect} className="hidden" accept=".pdf,.doc,.docx,.ppt,.xls,.jpg,.png,.svg,.tex" />
                <button type="button" onClick={() => fileInputRef.current.click()} className="w-full pl-4 pr-4 py-3 bg-gray-50 rounded-xl text-sm font-medium text-gray-600 hover:text-blue-600 flex justify-center items-center gap-2 border hover:border-blue-300 transition-colors">
                  <UploadCloud size={18} /> Đính kèm nhiều File
                </button>
              </div>
              <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-1 hover:border-blue-300 transition-colors">
                <Calendar className="text-blue-500 mr-2 shrink-0" size={18} />
                <span className="text-sm font-bold text-gray-700 mr-2 whitespace-nowrap">Hạn nộp:</span>
                <input type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} className="w-full bg-transparent py-2 text-sm outline-none text-gray-800 font-medium" />
              </div>
            </div>
            <button disabled={isPosting} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold float-right disabled:opacity-50 w-full md:w-auto">{isPosting ? 'Đang tải lên...' : 'Đăng Bài'}</button>
            <div className="clear-both"></div>
          </form>
        )}

        {/* TIMELINE */}
        <div className="space-y-8">
          {posts.map(post => {
            const mySubmission = post.post_submissions.find(s => s.student_id === currentUserId);
            const isAssignment = post.deadline !== null;
            // KIỂM TRA HẾT HẠN (DEADLINE KHÓA NỘP BÀI)
            const isExpired = isAssignment && new Date(post.deadline) < new Date();
            
            // Lấy danh sách file đính kèm của giáo viên
            const teacherFiles = parseFiles(post.file_url);

            return (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold"><User size={20} /></div>
                    <div>
                      <h4 className="font-bold text-gray-800">{post.users?.full_name || 'Giáo viên'}</h4>
                      <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{post.title}</h3>
                  <p className="text-gray-700 whitespace-pre-line mb-4">{post.content}</p>

                  {/* DANH SÁCH FILE CỦA GIÁO VIÊN */}
                  {teacherFiles.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {teacherFiles.map((file, idx) => (
                        <button key={idx} onClick={() => setPreviewFile(file.url)} className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all text-left">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm"><FileText size={18} /></div>
                            <div>
                              <p className="font-bold text-blue-800 text-sm truncate">{file.name}</p>
                            </div>
                          </div>
                          <Eye className="text-blue-500 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}

                  {post.deadline && (
                    <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold border border-red-100">
                      <Calendar size={16} /> Hạn nộp: {new Date(post.deadline).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>

                {/* KHU VỰC NỘP BÀI */}
                {isAssignment && (
                  <div className="px-6 pb-6">
                    {(currentUserRole === 'teacher' || currentUserRole === 'admin' || currentUserRole === 'super_admin') ? (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Upload size={18}/> Danh sách Học sinh đã nộp ({post.post_submissions.length})</h4>
                        {post.post_submissions.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">Chưa có học sinh nào nộp bài.</p>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {post.post_submissions.map(sub => {
                              const studentFiles = parseFiles(sub.file_url);
                              return (
                                <div key={sub.id} className="bg-white p-3 rounded-lg border shadow-sm flex flex-col gap-2">
                                  <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                    <p className="font-bold text-sm text-gray-800">{sub.users?.full_name}</p>
                                    <p className="text-xs text-gray-500">{new Date(sub.created_at).toLocaleString('vi-VN')}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {studentFiles.map((sf, idx) => (
                                      <button key={idx} onClick={() => setPreviewFile(sf.url)} className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded text-xs font-bold hover:bg-green-100 flex items-center gap-1 truncate max-w-full">
                                        <Eye size={14}/> {sf.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* GIAO DIỆN HỌC SINH NỘP BÀI */
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${isExpired && !mySubmission ? 'bg-red-50 border-red-200' : 'bg-white border-gray-300 hover:border-blue-400'}`}>
                        {mySubmission ? (
                          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex flex-col items-center">
                            <CheckCircle className="text-green-500 mb-2" size={32} />
                            <p className="font-bold text-green-700">Đã nộp bài thành công!</p>
                            <p className="text-xs text-green-600 mb-4">{new Date(mySubmission.created_at).toLocaleString('vi-VN')}</p>
                            
                            <div className="flex flex-wrap justify-center gap-2 mb-4 w-full">
                              {parseFiles(mySubmission.file_url).map((sf, idx) => (
                                <button key={idx} onClick={() => setPreviewFile(sf.url)} className="bg-white text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-green-200 hover:bg-green-100 truncate max-w-xs flex items-center gap-1">
                                  <Eye size={14}/> {sf.name}
                                </button>
                              ))}
                            </div>

                            {!isExpired && (
                              <button onClick={() => handleUnsubmit(mySubmission.id)} className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 hover:bg-red-50 flex items-center gap-1"><Trash2 size={14}/> Hủy nộp bài</button>
                            )}
                          </div>
                        ) : isExpired ? (
                          // LOGIC KHÓA NỘP BÀI KHI HẾT HẠN
                          <div className="flex flex-col items-center justify-center py-4">
                            <AlertCircle className="text-red-500 mb-2" size={36} />
                            <h4 className="font-bold text-red-600 text-lg">Đã hết hạn nộp bài</h4>
                            <p className="text-sm text-red-400">Bạn không thể nộp bài tập này nữa do đã quá thời gian quy định.</p>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="mx-auto mb-3 text-gray-400" size={40} />
                            <h4 className="font-bold text-gray-700 mb-1">Nộp bài tập của bạn</h4>
                            <p className="text-xs text-gray-500 mb-4">Nhấn nút bên dưới để chọn nhiều file (Tối đa 5 file)</p>
                            
                            {(submitFiles[post.id] || []).length > 0 && (
                              <div className="mb-4 space-y-2 text-left bg-gray-50 p-3 rounded-lg max-w-sm mx-auto">
                                {(submitFiles[post.id] || []).map((file, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm font-medium text-gray-700">
                                    <span className="truncate mr-2"><FileText size={14} className="inline mr-1 text-gray-400"/>{file.name}</span>
                                    <button onClick={() => removeStudentFile(post.id, idx)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row justify-center gap-3">
                              <input type="file" multiple id={`submit-${post.id}`} className="hidden" onChange={(e) => handleStudentFileSelect(e, post.id)} accept=".pdf,.doc,.docx,.jpg,.png,.svg,.tex" />
                              <button onClick={() => document.getElementById(`submit-${post.id}`).click()} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 border">Chọn File...</button>
                              
                              {(submitFiles[post.id] || []).length > 0 && (
                                <button onClick={() => handleSubmitAssignment(post.id)} disabled={isSubmitting[post.id]} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md transition-all">
                                  {isSubmitting[post.id] ? 'Đang nộp...' : 'Nộp Bài Ngay'}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* BÌNH LUẬN HỎI ĐÁP */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-2 text-gray-600 font-medium mb-4 text-sm"><MessageSquare size={16} /> Hỏi đáp về bài này</div>
                  <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                    {post.post_comments.map(cmt => (
                      <div key={cmt.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{cmt.users?.full_name?.charAt(0) || 'U'}</div>
                        <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-tl-none w-full shadow-sm">
                          <p className="text-xs font-bold text-gray-800 mb-1">{cmt.users?.full_name || 'Ẩn danh'} <span className="text-gray-400 font-normal ml-2">{new Date(cmt.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span></p>
                          <p className="text-sm text-gray-700">{cmt.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={(e) => handleSendComment(e, post.id)} className="flex items-center gap-2 relative">
                    <input 
                      type="text" placeholder="Viết bình luận hỏi đáp..." 
                      value={commentInputs[post.id] || ''} onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm pr-12"
                    />
                    <button disabled={isCommenting} type="submit" className="absolute right-1.5 top-1.5 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50">
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Eye className="text-blue-600"/> Xem trước tài liệu</h3>
              <div className="flex items-center gap-3">
                <a href={previewFile} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline">Tải xuống</a>
                <button onClick={() => setPreviewFile(null)} className="p-2 bg-gray-200 hover:bg-red-500 hover:text-white rounded-full"><X size={20} /></button>
              </div>
            </div>
            <div className="p-4 bg-gray-100 flex-1 overflow-auto flex items-center justify-center">
              {renderFileViewer(previewFile)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}