import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './Auth/supabaseClient';
import { FiEye, FiEyeOff } from 'react-icons/fi'; 
import '../Styles/Auth.css';
import API_BASE_URL from './Auth/Config';

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState('login'); 
  const [isAnimate, setIsAnimate] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [otpSent, setOtpSent] = useState(false);

  const [showPass, setShowPass] = useState(false);       
  const [showConfirm, setShowConfirm] = useState(false); 
  const [showNewPass, setShowNewPass] = useState(false); 

  const initialFormState = {
    name: '', phone: '', email: '', password: '', confirmPassword: '', otp: '', newPassword: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    setIsAnimate(true); 
    if (location.state?.mode === 'signup') {
      setMode('signup');
    } else {
      setMode('login');
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const switchMode = (newMode) => {
    setIsAnimate(false); 
    setTimeout(() => {
      setMode(newMode);
      setOtpSent(false);
      setMessage({ type: '', text: '' });
      setFormData(initialFormState);
      
      setShowPass(false);
      setShowConfirm(false);
      setShowNewPass(false);
      
      setIsAnimate(true); 
    }, 10);
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      setMessage({ type: 'error', text: 'Please enter your email first.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOtpSent(true);
      setMessage({ type: 'success', text: 'OTP sent to your email.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const { name, phone, email, password, confirmPassword, otp, newPassword } = formData;

    try {
      if (mode === 'signup') {
        if (!name || !phone || !email || !password || !confirmPassword) throw new Error('All fields required');
        if (password !== confirmPassword) throw new Error('Passwords do not match');

        const { data, error } = await supabase.auth.signUp({
          email, 
          password, 
          options: { data: { full_name: name, phone } }
        });

        if (error) throw error;

        if (data?.user) {
            const { error: dbError } = await supabase
                .from('users_profile')
                .upsert({ 
                    id: data.user.id,
                    full_name: name,
                    email: email,
                    phone: phone,
                    created_at: new Date()
                });
            if (dbError) console.error("Profile creation warning:", dbError.message);
        }

        setMessage({ type: 'success', text: "Account created successfully! We've sent a confirmation link to your email." });
        setTimeout(() => switchMode('login'), 2000);

      } else if (mode === 'login') {
        if (!email || !password) throw new Error('Email and Password required');
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // --- CHECK IF USER IS BLOCKED ---
        const { data: profile, error: profileError } = await supabase
            .from('users_profile')
            .select('status')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error("Profile check error:", profileError.message);
        } else if (profile && profile.status === false) {
            await supabase.auth.signOut();
            throw new Error('Your account is blocked. Please contact administrative.');
        }
        // ------------------------------

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', data.user.user_metadata.full_name || 'User');
        localStorage.setItem('loginTimestamp', new Date().getTime().toString()); // Save login time
        window.dispatchEvent(new Event("storage"));
        
        // Fire-and-forget backend profile sync to prevent freezing redirect
        fetch(`${API_BASE_URL}/api/user-profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${data.session.access_token}` }
        }).catch(e => console.log("Backend sync skipped", e));

        setMessage({ type: 'success', text: 'Login Successful!' });
        navigate('/dashboard');

      } else if (mode === 'forgot') {
        if (!otpSent) {
            await handleSendOtp();
            return;
        }

        if (!otp || !newPassword) throw new Error('OTP and New Password required');

        const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setMessage({ type: 'success', text: 'Password Reset Successful! Please Login.' });
        setTimeout(() => switchMode('login'), 2000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`Signup_container ${isAnimate ? 'auth_animated' : ''}`}>
      <div className="Signup_infoSection">
        <div className="Signup_overlay">
          <h1 className="Signup_slogan">
            {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Join Us' : 'Reset Password'}
          </h1>
          <p className="Signup_subtext">
            {mode === 'forgot' 
                ? 'Securely reset your access using OTP verification.' 
                : 'The ultimate cloud storage for your daily frontend challenges.'}
          </p>
          
          <div className={mode === 'login' ? "Signup_singleImageWrapper" : "Signup_imageGrid"}>
            {mode === 'login' ? (
              <img src="https://picsum.photos/400/400?random=1" alt="Visual" className="Signup_image auth_pop-element" />
            ) : (
              <>
                {[1, 2, 3, 4].map(i => (
                  <img key={i} src={`https://picsum.photos/200/200?random=${i}`} alt="Grid" className="Signup_gridItem auth_pop-element" />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="Signup_formSection">
        <div className="Signup_formWrapper auth_form-fade">
          <h2 className="Signup_header">
            {mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Account' : 'Forgot Password'}
          </h2>
          {message.text && <div className={`Signup_message Signup_${message.type}`}>{message.text}</div>}

          {/* ADDED autoComplete="off" HERE */}
          <form className="Signup_form" onSubmit={handleSubmit} autoComplete="off">
            {mode === 'signup' && (
              <>
                <div className="Signup_inputGroup">
                  <label className="Signup_label">Full Name</label>
                  <input className="Signup_input" type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="Signup_inputGroup">
                  <label className="Signup_label">Phone Number</label>
                  <input className="Signup_input" type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                </div>
              </>
            )}

            <div className="Signup_inputGroup">
              <label className="Signup_label">Email Address</label>
              {/* ADDED autoComplete="off" */}
              <input 
                className="Signup_input" 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="user@example.com"
                readOnly={mode === 'forgot' && otpSent} 
                autoComplete="off" 
                required 
              />
            </div>

            {mode !== 'forgot' && (
                <div className="Signup_inputGroup">
                  <label className="Signup_label">Password</label>
                  <div className="Signup_passwordWrapper">
                    {/* ADDED autoComplete="new-password" */}
                    <input 
                      className="Signup_input" 
                      type={showPass ? "text" : "password"} 
                      name="password" 
                      value={formData.password} 
                      onChange={handleChange} 
                      placeholder="••••••••" 
                      autoComplete="new-password" 
                      required 
                    />
                    <button type="button" className="Signup_eyeBtn" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
            )}
            
            {mode === 'signup' && (
              <div className="Signup_inputGroup">
                <label className="Signup_label">Confirm Password</label>
                <div className="Signup_passwordWrapper">
                  <input 
                    className="Signup_input" 
                    type={showConfirm ? "text" : "password"} 
                    name="confirmPassword" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    placeholder="••••••••" 
                    autoComplete="new-password"
                    required 
                  />
                  <button type="button" className="Signup_eyeBtn" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'forgot' && !otpSent && (
                <button type="button" onClick={handleSendOtp} className="Signup_submitBtn" disabled={loading}>
                    {loading ? 'Sending...' : 'Send OTP'}
                </button>
            )}

            {mode === 'forgot' && otpSent && (
                <>
                    <div className="Signup_inputGroup auth_pop-element">
                        <label className="Signup_label">Enter OTP</label>
                        <input className="Signup_input" type="text" name="otp" value={formData.otp} onChange={handleChange} placeholder="123456" required autoComplete="off" />
                    </div>
                    
                    <div className="Signup_inputGroup auth_pop-element">
                        <label className="Signup_label">New Password</label>
                        <div className="Signup_passwordWrapper">
                          <input 
                            className="Signup_input" 
                            type={showNewPass ? "text" : "password"} 
                            name="newPassword" 
                            value={formData.newPassword} 
                            onChange={handleChange} 
                            placeholder="••••••••" 
                            autoComplete="new-password"
                            required 
                          />
                          <button type="button" className="Signup_eyeBtn" onClick={() => setShowNewPass(!showNewPass)}>
                            {showNewPass ? <FiEyeOff /> : <FiEye />}
                          </button>
                        </div>
                    </div>
                    <button type="submit" className="Signup_submitBtn" disabled={loading}>
                        {loading ? 'Processing...' : 'Reset Password'}
                    </button>
                </>
            )}

            {mode !== 'forgot' && (
                <button type="submit" className="Signup_submitBtn" disabled={loading}>
                {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up')}
                </button>
            )}
          </form>

          <div className="Signup_footer">
            {mode === 'login' && (
                <a href="#" onClick={(e) => { e.preventDefault(); switchMode('forgot'); }} className="Signup_link">
                  Forgot Password?
                </a>
            )}
            
            <p className="Signup_footerText">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "} 
              {mode === 'forgot' ? (
                  <button onClick={() => switchMode('login')} className="Signup_toggleBtn">Back to Login</button>
              ) : (
                  <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="Signup_toggleBtn">
                    {mode === 'login' ? 'Sign Up' : 'Login'}\
                  </button>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;