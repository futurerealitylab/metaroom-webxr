#include "common_header.h"

#include <glm/glm.hpp>
#include <unordered_map>
#include <vector>
#include <string>
#include <chrono>

template <typename T>
struct BLA {
    T x;
};
template <typename T>
BLA<T> make_BLA() {
    BLA<T> bla;

    std::unordered_map<T, T> map;
    std::vector<T> bla2;

    std::string str = "WEE";
    //str = str.substr(0, 2);
    return bla;
}


#ifdef __cplusplus
extern "C" {
#endif

char* malloc_copy(char* input)
{   
    usize len = strlen(input) + 1;

    char* result = (char*)malloc(len);
    if (result == NULL) {
        return NULL;
    }

    strncpy(result, input, len);

    return result;
}

void malloc_free(char* input)
{
    free(input);
}

float32 print_num(float val);

float32 my_sin(float32 val) 
{   
    float32 result = sinf(val);

    float32 result_times_2 = print_num(result);

    print_num(result_times_2);

    return result;
}

long fibonacci(unsigned n) {
    if (n < 2) return n;
    return fibonacci(n-1) + fibonacci(n-2);
}

void set_char(char* input)
{
    input[0] = '\'';

    uint8 fibonacci_series[] = { 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 };
    for (uint8 number : fibonacci_series) {
        input[0] = number;
    }

    auto WEE = make_BLA<int>();
    WEE.x = 18;

    glm::vec4 v(100.0f, 200.0f, 300.0f, 1.0f);

    glm::vec4 v_out = glm::mat4(1.0f) * v;

    input[0] = 5 + static_cast<int>(v_out.x) * input[1];

    /*

     auto start = std::chrono::system_clock::now();
    long out = fibonacci(42);
    auto end = std::chrono::system_clock::now();
 
    std::chrono::duration<double> elapsed_seconds = end-start;
    std::time_t end_time = std::chrono::system_clock::to_time_t(end);
 
              auto elapsed = elapsed_seconds.count();

              */
}

#ifdef __cplusplus
}
#endif

