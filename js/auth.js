const SUPABASE_URL = 'https://nmwktpnsbwhgxkqmcaud.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0v9XHkOALMZlg-cQHE6mCA_d_1j6xbE';

function showMessage(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message;
}

function getSupabaseClient() {
  if (!window.supabase) {
    throw new Error('Biblioteca do Supabase não foi carregada.');
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

document.addEventListener('DOMContentLoaded', () => {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    console.error(error);
    showMessage('signup-message', 'Erro ao carregar o sistema de cadastro. Atualize a página e tente novamente.');
    showMessage('login-message', 'Erro ao carregar o sistema de login. Atualize a página e tente novamente.');
    return;
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage('login-message', 'Entrando...');

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = 'index.html';
      } catch (error) {
        console.error('Login Supabase:', error);
        showMessage('login-message', error.message || 'Não foi possível entrar. Verifique o email e a senha.');
      }
    });
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirmation = document.getElementById('signup-password-confirm').value;

      if (password !== confirmation) {
        showMessage('signup-message', 'As senhas não coincidem.');
        return;
      }

      showMessage('signup-message', 'Criando sua conta...');

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: new URL('login.html', window.location.href).href
          }
        });

        if (error) throw error;

        if (data.session) {
          showMessage('signup-message', 'Conta criada! Entrando...');
          window.location.href = 'index.html';
        } else {
          showMessage('signup-message', 'Conta criada! Verifique seu email para confirmar o cadastro antes de entrar.');
          signupForm.reset();
        }
      } catch (error) {
        console.error('Cadastro Supabase:', error);
        showMessage('signup-message', error.message || 'Não foi possível criar a conta.');
      }
    });
  }

  const recoveryForm = document.getElementById('recovery-form');
  const setNewPassword = document.getElementById('set-new-password');
  const requestReset = document.getElementById('request-reset');

  if (recoveryForm) {
    recoveryForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = document.getElementById('recovery-email').value.trim();
      showMessage('recovery-message', 'Enviando link...');

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: new URL('recuperar-senha.html', window.location.href).href
        });
        if (error) throw error;
        showMessage('recovery-message', 'Link enviado! Verifique seu email para continuar.');
      } catch (error) {
        console.error('Recuperação Supabase:', error);
        showMessage('recovery-message', error.message || 'Não foi possível enviar o link. Tente novamente.');
      }
    });
  }

  supabase.auth.getSession().then(({ data }) => {
    if (data.session && setNewPassword && requestReset && window.location.hash.includes('type=recovery')) {
      requestReset.hidden = true;
      setNewPassword.hidden = false;
    }
  });

  const updateButton = document.getElementById('update-password');
  if (updateButton) {
    updateButton.addEventListener('click', async () => {
      const password = document.getElementById('new-password').value;
      const confirmation = document.getElementById('new-password-confirm').value;

      if (password.length < 6) {
        showMessage('new-password-message', 'A senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (password !== confirmation) {
        showMessage('new-password-message', 'As senhas não coincidem.');
        return;
      }

      showMessage('new-password-message', 'Atualizando senha...');

      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Atualização de senha:', error);
        showMessage('new-password-message', error.message || 'Não foi possível atualizar a senha. Solicite um novo link.');
      }
    });
  }
});
