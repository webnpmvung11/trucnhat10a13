const fs = require('fs');
let code = fs.readFileSync('src/components/ScheduleManager.tsx', 'utf8');

const targetUpload = `  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const f of files) {
      if (f.size > 4 * 1024 * 1024) {
        setErrorMsg('Kích thước mỗi ảnh phải nhỏ hơn 4MB');
        return;
      }
    }

    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      setPhotosBase64(prev => [...prev, ...results].slice(0, 5)); // Tối đa 5 ảnh
      setErrorMsg('');
    });
  };`;

const replaceUpload = `  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const f of files) {
      if (f.size > 4 * 1024 * 1024) {
        setErrorMsg('Kích thước mỗi ảnh phải nhỏ hơn 4MB');
        return;
      }
    }

    try {
      const compressedPhotos = await Promise.all(files.map(f => compressImage(f)));
      setPhotosBase64(prev => [...prev, ...compressedPhotos].slice(0, 5));
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Lỗi khi nén ảnh.');
    }
  };`;

const targetSubmit = `  const submitCompletion = async () => {
    if (!taskContent.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập nội dung công việc');
      return;
    }
    
    await completeSchedule(selectedSchedule.id, taskContent, photosBase64);
    setSuccessMsg('Đã ghi nhận hoàn thành trực nhật!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setSelectedSchedule(null);
    setTaskContent('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
    setPhotosBase64([]);
    setErrorMsg('');
    loadData();
  };`;

const replaceSubmit = `  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCompletion = async () => {
    if (!taskContent.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập nội dung công việc');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await completeSchedule(selectedSchedule.id, taskContent, photosBase64);
      setSuccessMsg('Đã ghi nhận hoàn thành trực nhật!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setSelectedSchedule(null);
      setTaskContent('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
      setPhotosBase64([]);
      loadData();
    } catch (err: any) {
      setErrorMsg('Lỗi khi gửi báo cáo: ' + (err.message || 'Dung lượng quá lớn, vui lòng giảm bớt ảnh.'));
    } finally {
      setIsSubmitting(false);
    }
  };`;

if(code.includes(targetUpload) && code.includes(targetSubmit)) {
  code = code.replace(targetUpload, replaceUpload);
  code = code.replace(targetSubmit, replaceSubmit);
  fs.writeFileSync('src/components/ScheduleManager.tsx', code);
  console.log('Patched ScheduleManager.tsx');
} else {
  console.error('Could not find targets');
}
